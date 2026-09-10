/**
 * Business Service (Epic 2 Feature 2.2 Task 2.2.1)
 * 
 * Handles business creation, owner binding, validation, and storage synchronization.
 */

import { db, DatabaseUniqueConstraintError, DatabaseValidationError } from '../db';
import { authService } from './authService';
import { auditService } from './auditService';
import { storageService } from './storageService';
import { CreateBusinessSchema, UpdateBusinessDescriptionSchema, UpdateBusinessCategoriesSchema, UpdateBusinessLocationSchema, UpdateOpeningHoursSchema, OpeningHoursArraySchema, UpdateBusinessContactSchema, validateAndNormalizeBusinessPhone, validateAndNormalizeBusinessEmail, validateAndNormalizeBusinessWebsite, PROTECTED_BUSINESS_FIELDS } from '../validators/businessValidators';
import { Business, CategoryConfig, BusinessCategory, LocationCoordinates, OpeningHour, formatOpeningHourDisplay, BusinessContactInfo } from '../../types';

export class BusinessServiceError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BUSINESS_ERROR', details?: any) {
    super(message);
    this.name = 'BusinessServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function generateBusinessSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return baseSlug || 'business';
}

export class BusinessService {
  /**
   * Create a new business owned by authenticated user
   */
  public async createBusiness(
    userId: string,
    payload: { name: string; [key: string]: any },
    clientIp: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<{ success: boolean; business: Business; message: string }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Role check: Only CLIENT accounts can establish business profile
    if (user.role !== 'CLIENT' && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Only CLIENT accounts can create a business profile.', 403, 'FORBIDDEN');
    }

    if (user.status === 'SUSPENDED') {
      throw new BusinessServiceError('Suspended accounts cannot create a business profile.', 403, 'ACCOUNT_SUSPENDED');
    }

    // 2. IDOR / Spoofing Guard: Client cannot specify another user as owner
    if (payload.ownerId !== undefined && payload.ownerId !== userId) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        details: {
          reason: 'Attempted to spoof business ownerId',
          targetOwnerId: payload.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You cannot create a business owned by another user.', 403, 'FORBIDDEN_OWNER_OVERRIDE');
    }

    if (payload.userId !== undefined && payload.userId !== userId) {
      throw new BusinessServiceError('Forbidden: You cannot create a business owned by another user.', 403, 'FORBIDDEN_OWNER_OVERRIDE');
    }

    // 3. Mass-assignment / Protected field injection defense
    for (const field of PROTECTED_BUSINESS_FIELDS) {
      if (payload[field] !== undefined) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId,
          userEmail: user.email,
          details: {
            reason: `Attempted mass assignment via protected field: ${field}`,
            field
          }
        });
        throw new BusinessServiceError(
          `Unauthorized attempt to set protected field: "${field}".`,
          403,
          'PRIVILEGE_ESCALATION_BLOCKED'
        );
      }
    }

    // 4. Validate payload with schema
    const parseResult = CreateBusinessSchema.safeParse(payload);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      throw new BusinessServiceError(
        firstIssue?.message || 'Invalid business data.',
        400,
        'VALIDATION_ERROR',
        parseResult.error.issues
      );
    }

    const { name, description, categoryIds, location } = parseResult.data;

    // Validate category IDs if provided
    if (categoryIds && categoryIds.length > 0) {
      for (const catId of categoryIds) {
        const catConfig = db.getCategoryById(catId);
        if (!catConfig) {
          throw new BusinessServiceError(`Invalid category: "${catId}" does not exist.`, 400, 'CATEGORY_NOT_FOUND');
        }
        if (catConfig.active === false) {
          throw new BusinessServiceError(`Category "${catConfig.name || catId}" is currently inactive.`, 400, 'CATEGORY_INACTIVE');
        }
      }
    }

    const now = new Date().toISOString();
    const id = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const slug = generateBusinessSlug(name);

    const newBiz: Business = {
      id,
      ownerId: userId,
      name,
      slug,
      ...(description ? { description } : {}),
      ...(location ? {
        location: {
          city: location.city,
          state: location.state,
          country: location.country || 'Nigeria',
          ...(location.address ? { address: location.address } : {}),
          ...(location.lga ? { lga: location.lga } : {}),
          ...(location.postalCode ? { postalCode: location.postalCode } : {}),
          ...(typeof location.lat === 'number' ? { lat: location.lat } : {}),
          ...(typeof location.lng === 'number' ? { lng: location.lng } : {}),
          ...(typeof location.isServiceAreaOnly === 'boolean' ? { isServiceAreaOnly: location.isServiceAreaOnly } : {}),
          ...(typeof location.serviceAreaKm === 'number' ? { serviceAreaKm: location.serviceAreaKm } : {})
        }
      } : {}),
      isVerified: false,
      createdAt: now,
      updatedAt: now
    };

    // 5. Atomically persist business and link to user
    db.createBusiness(newBiz);

    if (categoryIds && categoryIds.length > 0) {
      db.setBusinessCategories(newBiz.id, categoryIds);
    }

    // 6. Record audit event
    auditService.log('BUSINESS_CREATED', id, userId, 'merchant', { businessName: name, categoryIds });

    const persistedBiz = db.getBusinessById(id) || newBiz;

    return {
      success: true,
      business: persistedBiz,
      message: 'Business created successfully.'
    };
  }

  /**
   * Fetch business by owner
   */
  public getBusinessByOwner(userId: string): Business | null {
    return db.getBusinessByOwnerId(userId);
  }

  /**
   * Fetch all businesses owned by user
   */
  public getBusinessesByOwner(userId: string): Business[] {
    return db.getBusinessesByOwnerId(userId);
  }

  /**
   * Fetch business by ID
   */
  public getBusinessById(businessId: string): Business | null {
    return db.getBusinessById(businessId) || null;
  }

  /**
   * Upload or replace business logo (Epic 2 Feature 2.2 Task 2.2.2)
   */
  public async uploadBusinessLogo(
    userId: string,
    businessId: string,
    imageInput: {
      buffer: Buffer;
      originalFilename?: string;
      mimeType?: string;
    },
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    logoUrl: string;
    logoKey: string;
    business: Business;
  }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED') {
      throw new BusinessServiceError('Suspended accounts cannot modify business assets.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.role !== 'CLIENT' && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Only CLIENT accounts can manage business profiles.', 403, 'FORBIDDEN');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Strict Server-Side Ownership Check (IDOR defense)
    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business logo upload attempt blocked',
          businessId,
          actualOwnerId: business.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 4. Validate image buffer
    const { buffer } = imageInput;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BusinessServiceError('No image file provided or file is empty.', 400, 'EMPTY_FILE');
    }

    if (buffer.length > storageService.MAX_AVATAR_SIZE_BYTES) {
      throw new BusinessServiceError('Image size exceeds maximum allowed limit of 5MB.', 413, 'FILE_TOO_LARGE');
    }

    // Server-side validation of file signature (magic bytes), format, and dimensions
    const validation = storageService.validateImageBuffer(buffer);
    if (!validation.isValid || !validation.format) {
      throw new BusinessServiceError(validation.error || 'Invalid or corrupt image format.', 400, 'INVALID_IMAGE');
    }

    // Capture previous logo key and URL for safe lifecycle cleanup
    const oldLogoKey = business.logoKey;
    const oldLogoUrl = business.logoUrl;

    // 5. Store new logo atomically
    const stored = await storageService.saveBusinessLogo(business.id, buffer, validation.format);

    try {
      // 6. Update database record atomically
      const updatedBusiness = db.updateBusiness(business.id, {
        logoUrl: stored.logoUrl,
        logoKey: stored.logoKey
      });

      // 7. Cleanup old logo file safely after successful database persistence
      if (oldLogoKey && oldLogoKey !== stored.logoKey) {
        storageService.deleteBusinessLogo(oldLogoKey).catch(err => {
          console.warn('[BusinessService] Obsolete business logo cleanup failed:', err);
        });
      } else if (oldLogoUrl && oldLogoUrl.includes('/api/media/logo/') && oldLogoUrl !== stored.logoUrl) {
        storageService.deleteBusinessLogo(oldLogoUrl).catch(err => {
          console.warn('[BusinessService] Obsolete business logo cleanup failed:', err);
        });
      }

      // 8. Audit logging
      auditService.log('BUSINESS_LOGO_UPDATED', business.id, userId, 'merchant', {
        logoKey: stored.logoKey,
        format: stored.format,
        sizeBytes: stored.sizeBytes
      });

      return {
        logoUrl: stored.logoUrl,
        logoKey: stored.logoKey,
        business: updatedBusiness
      };
    } catch (dbErr) {
      // Roll back written file on database update failure
      await storageService.deleteBusinessLogo(stored.logoKey).catch(() => {});
      throw dbErr;
    }
  }

  /**
   * Remove business logo safely (Epic 2 Feature 2.2 Task 2.2.2)
   */
  public async removeBusinessLogo(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    business: Business;
  }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED') {
      throw new BusinessServiceError('Suspended accounts cannot modify business assets.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.role !== 'CLIENT' && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Only CLIENT accounts can manage business profiles.', 403, 'FORBIDDEN');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Strict Server-Side Ownership Check (IDOR defense)
    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business logo removal attempt blocked',
          businessId,
          actualOwnerId: business.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const oldLogoKey = business.logoKey;
    const oldLogoUrl = business.logoUrl;

    // 4. Clear logo in database atomically
    const updatedBusiness = db.updateBusiness(business.id, {
      logoUrl: '',
      logoKey: ''
    });

    // 5. Clean up file on storage safely
    if (oldLogoKey) {
      await storageService.deleteBusinessLogo(oldLogoKey).catch(() => {});
    } else if (oldLogoUrl && oldLogoUrl.includes('/api/media/logo/')) {
      await storageService.deleteBusinessLogo(oldLogoUrl).catch(() => {});
    }

    // 6. Audit logging
    auditService.log('BUSINESS_LOGO_REMOVED', business.id, userId, 'merchant', {});

    return {
      business: updatedBusiness
    };
  }

  /**
   * Upload or replace business cover image safely (Epic 2 Feature 2.2 Task 2.2.3)
   */
  public async uploadBusinessCover(
    userId: string,
    businessId: string,
    imageInput: {
      buffer: Buffer;
      originalFilename?: string;
    },
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    coverUrl: string;
    coverKey: string;
    business: Business;
  }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED') {
      throw new BusinessServiceError('Suspended accounts cannot modify business assets.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.role !== 'CLIENT' && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Only CLIENT accounts can manage business profiles.', 403, 'FORBIDDEN');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Strict Server-Side Ownership Check (IDOR defense)
    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business cover image upload attempt blocked',
          businessId,
          actualOwnerId: business.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 4. Validate image buffer
    const { buffer } = imageInput;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BusinessServiceError('No image file provided or file is empty.', 400, 'EMPTY_FILE');
    }

    if (buffer.length > storageService.MAX_AVATAR_SIZE_BYTES) {
      throw new BusinessServiceError('Image size exceeds maximum allowed limit of 5MB.', 413, 'FILE_TOO_LARGE');
    }

    // Server-side validation of file signature (magic bytes), format, and dimensions
    const validation = storageService.validateImageBuffer(buffer);
    if (!validation.isValid || !validation.format) {
      throw new BusinessServiceError(validation.error || 'Invalid or corrupt image format.', 400, 'INVALID_IMAGE');
    }

    // Capture previous cover key and URL for safe lifecycle cleanup
    const oldCoverKey = business.coverImageKey;
    const oldCoverUrl = business.coverImageUrl;

    // 5. Store new cover atomically
    const stored = await storageService.saveBusinessCover(business.id, buffer, validation.format);

    try {
      // 6. Update database record atomically
      const updatedBusiness = db.updateBusiness(business.id, {
        coverImageUrl: stored.coverUrl,
        coverImageKey: stored.coverKey
      });

      // 7. Cleanup old cover file safely after successful database persistence
      if (oldCoverKey && oldCoverKey !== stored.coverKey) {
        storageService.deleteBusinessCover(oldCoverKey).catch(err => {
          console.warn('[BusinessService] Obsolete business cover cleanup failed:', err);
        });
      } else if (oldCoverUrl && oldCoverUrl.includes('/api/media/cover/') && oldCoverUrl !== stored.coverUrl) {
        storageService.deleteBusinessCover(oldCoverUrl).catch(err => {
          console.warn('[BusinessService] Obsolete business cover cleanup failed:', err);
        });
      }

      // 8. Audit logging
      auditService.log('BUSINESS_COVER_UPDATED', business.id, userId, 'merchant', {
        coverKey: stored.coverKey,
        format: stored.format,
        sizeBytes: stored.sizeBytes
      });

      return {
        coverUrl: stored.coverUrl,
        coverKey: stored.coverKey,
        business: updatedBusiness
      };
    } catch (dbErr) {
      // Roll back written file on database update failure
      await storageService.deleteBusinessCover(stored.coverKey).catch(() => {});
      throw dbErr;
    }
  }

  /**
   * Remove business cover image safely (Epic 2 Feature 2.2 Task 2.2.3)
   */
  public async removeBusinessCover(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    business: Business;
  }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED') {
      throw new BusinessServiceError('Suspended accounts cannot modify business assets.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.role !== 'CLIENT' && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Only CLIENT accounts can manage business profiles.', 403, 'FORBIDDEN');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Strict Server-Side Ownership Check (IDOR defense)
    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business cover removal attempt blocked',
          businessId,
          actualOwnerId: business.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const oldCoverKey = business.coverImageKey;
    const oldCoverUrl = business.coverImageUrl;

    // 4. Clear cover image in database atomically
    const updatedBusiness = db.updateBusiness(business.id, {
      coverImageUrl: '',
      coverImageKey: ''
    });

    // 5. Clean up file on storage safely
    if (oldCoverKey) {
      await storageService.deleteBusinessCover(oldCoverKey).catch(() => {});
    } else if (oldCoverUrl && oldCoverUrl.includes('/api/media/cover/')) {
      await storageService.deleteBusinessCover(oldCoverUrl).catch(() => {});
    }

    // 6. Audit logging
    auditService.log('BUSINESS_COVER_REMOVED', business.id, userId, 'merchant', {});

    return {
      business: updatedBusiness
    };
  }

  /**
   * Update business description (Epic 2 Feature 2.2 Task 2.2.4)
   * 
   * Enforces:
   * - Authenticated active user check
   * - Strict server-side ownership authorization (Anti-IDOR)
   * - Validation & Sanitization (max 2000 chars, null byte rejection, XSS defense)
   * - Safe newline preservation and whitespace normalization
   * - Empty description reset handling
   * - Audit logging
   */
  public async updateBusinessDescription(
    userId: string,
    businessId: string,
    description: string | null | undefined,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<{ success: boolean; business: Business; description?: string; message: string }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED') {
      throw new BusinessServiceError('Suspended accounts cannot modify business profiles.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.role !== 'CLIENT' && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Only CLIENT accounts can manage business profiles.', 403, 'FORBIDDEN');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Strict Server-Side Ownership Check (Anti-IDOR)
    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business description modification attempt blocked',
          businessId,
          actualOwnerId: business.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 4. Validate & Sanitize Description
    const parseResult = UpdateBusinessDescriptionSchema.safeParse({ description: description ?? '' });
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || 'Invalid description content.';
      throw new BusinessServiceError(errorMsg, 400, 'VALIDATION_ERROR', parseResult.error.issues);
    }

    const sanitizedDescription = parseResult.data.description;

    // 5. Update business in database atomically
    const updatedBusiness = db.updateBusiness(business.id, {
      description: sanitizedDescription
    });

    // 6. Audit logging
    auditService.log('BUSINESS_DESCRIPTION_UPDATED', business.id, userId, 'merchant', {
      length: sanitizedDescription.length
    });

    return {
      success: true,
      business: updatedBusiness,
      description: updatedBusiness.description,
      message: 'Business description updated successfully'
    };
  }

  // ========================================================
  // Epic 2 Feature 2.2 Task 2.2.5: Business Categories
  // ========================================================

  /**
   * Fetch all system categories
   */
  public getAvailableCategories(includeInactive: boolean = false): CategoryConfig[] {
    if (includeInactive) {
      return db.getAllCategories();
    }
    return db.getActiveCategories();
  }

  /**
   * Fetch categories assigned to a business
   */
  public async getBusinessCategories(
    userId: string,
    businessId: string
  ): Promise<{
    success: boolean;
    businessId: string;
    categories: CategoryConfig[];
    categoryIds: string[];
    businessCategories: BusinessCategory[];
  }> {
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    const bcs = db.getBusinessCategories(businessId);
    const configs = db.getBusinessCategoryConfigs(businessId);
    const categoryIds = (business.categories && business.categories.length > 0)
      ? (business.categories as string[])
      : bcs.map(bc => String(bc.categoryId));

    return {
      success: true,
      businessId,
      categories: configs,
      categoryIds,
      businessCategories: bcs
    };
  }

  /**
   * Update categories assigned to a business
   * Enforces:
   * - Authentication & authorization (owner only)
   * - IDOR defense
   * - Mass-assignment protection
   * - Valid controlled category IDs (from db.categories)
   * - Category active status check
   * - Max 5 categories limit
   * - Deduplication
   */
  public async updateBusinessCategories(
    userId: string,
    businessId: string,
    payload: any,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    categoryIds: string[];
    businessCategories: BusinessCategory[];
    message: string;
  }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user || user.status === 'SUSPENDED') {
      throw new BusinessServiceError('User is not authorized or account is suspended.', 403, 'USER_SUSPENDED');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Verify server-side ownership (anti-IDOR)
    const isOwner = business.ownerId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business category update attempt blocked (IDOR)',
          targetBusinessId: businessId,
          actualOwnerId: business.ownerId,
          action: 'UPDATE_BUSINESS_CATEGORIES'
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 4. Mass-assignment protection: check for forbidden fields
    if (payload && typeof payload === 'object') {
      const extraProtectedFields = [
        ...PROTECTED_BUSINESS_FIELDS,
        'name', 'logo', 'logoUrl', 'coverImageUrl', 'description', 'location',
        'openingHours', 'phone', 'whatsapp', 'email', 'website', 'contactInformation'
      ];
      for (const field of extraProtectedFields) {
        if (field in payload) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId,
            userEmail: user.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: 'Attempted modification of protected field during category update',
              businessId,
              attemptedField: field,
              action: 'UPDATE_BUSINESS_CATEGORIES'
            }
          });
          throw new BusinessServiceError(
            `Unauthorized attempt to set protected field: "${field}".`,
            403,
            'PRIVILEGE_ESCALATION_BLOCKED'
          );
        }
      }
    }

    // 5. Normalize categoryIds from payload
    let rawCategoryIds: any[] = [];
    if (payload && Array.isArray(payload.categoryIds)) {
      rawCategoryIds = payload.categoryIds;
    } else if (payload && Array.isArray(payload.categories)) {
      rawCategoryIds = payload.categories;
    } else if (payload && typeof payload.categoryId === 'string') {
      rawCategoryIds = [payload.categoryId];
    } else if (Array.isArray(payload)) {
      rawCategoryIds = payload;
    } else if (payload && typeof payload === 'object' && Object.keys(payload).length === 0) {
      rawCategoryIds = [];
    } else if (!payload || typeof payload !== 'object') {
      throw new BusinessServiceError('Invalid payload: expected categoryIds array.', 400, 'INVALID_PAYLOAD');
    } else {
      throw new BusinessServiceError('Invalid payload: categoryIds must be an array of category identifiers.', 400, 'INVALID_PAYLOAD');
    }

    // 6. Schema validation
    const parseResult = UpdateBusinessCategoriesSchema.safeParse({ categoryIds: rawCategoryIds });
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      throw new BusinessServiceError(
        firstIssue?.message || 'Invalid category selection.',
        400,
        'VALIDATION_ERROR',
        parseResult.error.issues
      );
    }

    const categoryIds = parseResult.data.categoryIds;

    // 7. Verify category existence and active status against controlled taxonomy
    for (const catId of categoryIds) {
      const catConfig = db.getCategoryById(catId);
      if (!catConfig) {
        throw new BusinessServiceError(
          `Invalid category: "${catId}" does not exist. Please select from available categories.`,
          400,
          'CATEGORY_NOT_FOUND'
        );
      }
      if (catConfig.active === false) {
        throw new BusinessServiceError(
          `Category "${catConfig.name || catId}" is currently inactive and cannot be assigned.`,
          400,
          'CATEGORY_INACTIVE'
        );
      }
    }

    // 8. Atomically update database join table & business entity
    const updateResult = db.setBusinessCategories(business.id, categoryIds);

    // 9. Record audit event
    auditService.log('BUSINESS_CATEGORIES_UPDATED', business.id, userId, 'merchant', {
      categoryIds,
      count: categoryIds.length
    });

    return {
      success: true,
      business: updateResult.business,
      categoryIds,
      businessCategories: updateResult.businessCategories,
      message: 'Business categories updated successfully'
    };
  }

  /**
   * Remove a single category from a business
   */
  public async removeBusinessCategory(
    userId: string,
    businessId: string,
    categoryId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    categoryIds: string[];
    businessCategories: BusinessCategory[];
    message: string;
  }> {
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // Verify ownership
    const isOwner = business.ownerId === userId;
    const user = db.getUserById(userId);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const currentIds = (business.categories || []) as string[];
    const newIds = currentIds.filter(id => id !== categoryId);

    const updateResult = db.setBusinessCategories(business.id, newIds);

    auditService.log('BUSINESS_CATEGORY_REMOVED', business.id, userId, 'merchant', {
      removedCategoryId: categoryId,
      remainingCount: newIds.length
    });

    return {
      success: true,
      business: updateResult.business,
      categoryIds: newIds,
      businessCategories: updateResult.businessCategories,
      message: 'Category removed successfully'
    };
  }

  /**
   * Clear all categories from a business
   */
  public async clearBusinessCategories(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    categoryIds: string[];
    businessCategories: BusinessCategory[];
    message: string;
  }> {
    return this.updateBusinessCategories(userId, businessId, { categoryIds: [] }, clientIp, userAgent);
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.6: Get Business Location
   */
  public async getBusinessLocation(businessId: string): Promise<LocationCoordinates | null> {
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }
    return business.location || null;
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.6: Update Business Location
   * 
   * Strict authorization:
   * - Caller must be authenticated and active (not suspended).
   * - Business must exist.
   * - IDOR Defense: Caller must be the business owner (or SUPER_ADMIN).
   * - Mass-assignment Defense: Rejects attempts to set protected fields or unrelated fields
   *   (e.g., ownerId, name, logo, categories, description, rating, isVerified, etc.).
   * - Schema validation: Validates coordinates, bounds, required fields, and string constraints.
   * - Audit logging: Records location updates and unauthorized attempts.
   */
  public async updateBusinessLocation(
    userId: string,
    businessId: string,
    payload: unknown,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    location: LocationCoordinates;
    message: string;
  }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user || user.status === 'SUSPENDED') {
      throw new BusinessServiceError('User is not authorized or account is suspended.', 403, 'USER_SUSPENDED');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Verify server-side ownership (anti-IDOR)
    const isOwner = business.ownerId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business location update attempt blocked (IDOR)',
          targetBusinessId: businessId,
          actualOwnerId: business.ownerId,
          action: 'UPDATE_BUSINESS_LOCATION'
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 4. Mass-assignment protection: check for forbidden fields
    if (payload && typeof payload === 'object') {
      const extraProtectedFields = [
        ...PROTECTED_BUSINESS_FIELDS,
        'name', 'logo', 'logoUrl', 'coverImageUrl', 'coverImageKey', 'logoKey',
        'description', 'categories', 'categoryIds', 'businessCategories',
        'openingHours', 'phone', 'whatsapp', 'email', 'website', 'contactInformation'
      ];
      for (const field of extraProtectedFields) {
        if (field in (payload as any)) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId,
            userEmail: user.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: 'Attempted modification of protected field during location update',
              businessId,
              attemptedField: field,
              action: 'UPDATE_BUSINESS_LOCATION'
            }
          });
          throw new BusinessServiceError(
            `Unauthorized attempt to set protected field: "${field}".`,
            403,
            'PRIVILEGE_ESCALATION_BLOCKED'
          );
        }
      }
    }

    // 5. Validate payload schema
    const parsed = UpdateBusinessLocationSchema.safeParse(payload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new BusinessServiceError(
        firstIssue?.message || 'Invalid location data.',
        400,
        'VALIDATION_ERROR',
        parsed.error.issues
      );
    }

    const { address, city, state, country, lga, postalCode, lat, lng, isServiceAreaOnly, serviceAreaKm } = parsed.data;

    // Build clean location object
    const cleanLocation: LocationCoordinates = {
      city,
      state,
      country: country || 'Nigeria'
    };

    if (address && address.trim()) {
      cleanLocation.address = address.trim();
    }
    if (lga && lga.trim()) {
      cleanLocation.lga = lga.trim();
    }
    if (postalCode && postalCode.trim()) {
      cleanLocation.postalCode = postalCode.trim();
    }
    if (typeof lat === 'number') {
      cleanLocation.lat = lat;
    }
    if (typeof lng === 'number') {
      cleanLocation.lng = lng;
    }
    if (typeof isServiceAreaOnly === 'boolean') {
      cleanLocation.isServiceAreaOnly = isServiceAreaOnly;
    }
    if (typeof serviceAreaKm === 'number') {
      cleanLocation.serviceAreaKm = serviceAreaKm;
    }

    // 6. Update database
    const updatedBusiness = db.updateBusiness(business.id, {
      location: cleanLocation
    });

    // 7. Audit log
    auditService.log('BUSINESS_LOCATION_UPDATED', business.id, userId, 'merchant', {
      city: cleanLocation.city,
      state: cleanLocation.state,
      country: cleanLocation.country,
      hasAddress: !!cleanLocation.address,
      hasCoordinates: typeof cleanLocation.lat === 'number' && typeof cleanLocation.lng === 'number'
    });

    return {
      success: true,
      business: updatedBusiness,
      location: cleanLocation,
      message: 'Business location updated successfully.'
    };
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.6: Clear Business Location
   */
  public async clearBusinessLocation(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    message: string;
  }> {
    const user = db.getUserById(userId);
    if (!user || user.status === 'SUSPENDED') {
      throw new BusinessServiceError('User is not authorized or account is suspended.', 403, 'USER_SUSPENDED');
    }

    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    const isOwner = business.ownerId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business location deletion attempt blocked (IDOR)',
          targetBusinessId: businessId,
          actualOwnerId: business.ownerId,
          action: 'CLEAR_BUSINESS_LOCATION'
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const updatedBusiness = db.updateBusiness(business.id, {
      location: null as any
    });

    auditService.log('BUSINESS_LOCATION_CLEARED', business.id, userId, 'merchant', {});

    return {
      success: true,
      business: updatedBusiness,
      message: 'Business location removed.'
    };
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.7: Get Business Opening Hours (Public)
   */
  public async getBusinessOpeningHours(businessId: string): Promise<{
    success: boolean;
    businessId: string;
    openingHours: OpeningHour[];
  }> {
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    return {
      success: true,
      businessId: business.id,
      openingHours: business.openingHours || []
    };
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.7: Update Business Opening Hours (Owner Only)
   */
  public async updateBusinessOpeningHours(
    userId: string,
    businessId: string,
    payload: any,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    openingHours: OpeningHour[];
    message: string;
  }> {
    // 1. Verify user authentication and status
    const user = db.getUserById(userId);
    if (!user || user.status === 'SUSPENDED') {
      throw new BusinessServiceError('User is not authorized or account is suspended.', 403, 'USER_SUSPENDED');
    }

    // 2. Fetch business
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. Verify ownership (anti-IDOR)
    const isOwner = business.ownerId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business opening hours modification attempt blocked (IDOR)',
          targetBusinessId: businessId,
          actualOwnerId: business.ownerId,
          action: 'UPDATE_BUSINESS_OPENING_HOURS'
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 4. Mass-assignment protection: check for forbidden fields
    if (payload && typeof payload === 'object') {
      const extraProtectedFields = [
        ...PROTECTED_BUSINESS_FIELDS,
        'name', 'logo', 'logoUrl', 'coverImageUrl', 'coverImageKey', 'logoKey',
        'description', 'categories', 'categoryIds', 'businessCategories',
        'location', 'phone', 'whatsapp', 'email', 'website', 'contactInformation'
      ];
      for (const field of extraProtectedFields) {
        if (field in (payload as any)) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId,
            userEmail: user.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: 'Attempted modification of protected field during opening hours update',
              businessId,
              attemptedField: field,
              action: 'UPDATE_BUSINESS_OPENING_HOURS'
            }
          });
          throw new BusinessServiceError(
            `Unauthorized attempt to set protected field: "${field}".`,
            403,
            'PRIVILEGE_ESCALATION_BLOCKED'
          );
        }
      }
    }

    // Extract schedule array
    let scheduleArray: any;
    if (Array.isArray(payload)) {
      scheduleArray = payload;
    } else if (payload && typeof payload === 'object' && Array.isArray(payload.openingHours)) {
      scheduleArray = payload.openingHours;
    } else {
      throw new BusinessServiceError(
        'Invalid opening hours format. Expected an array of day opening hours.',
        400,
        'VALIDATION_ERROR'
      );
    }

    // 5. Validate schema
    const parsed = OpeningHoursArraySchema.safeParse(scheduleArray);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new BusinessServiceError(
        firstIssue?.message || 'Invalid opening hours data.',
        400,
        'VALIDATION_ERROR',
        parsed.error.issues
      );
    }

    // 6. Build clean, sanitized opening hours items
    const cleanOpeningHours: OpeningHour[] = parsed.data.map(dayItem => {
      if (!dayItem.isOpen) {
        return {
          day: dayItem.day,
          isOpen: false,
          hours: 'Closed',
          periods: []
        };
      }
      const periods = (dayItem.periods || []).map(p => ({
        open: p.open,
        close: p.close,
        ...(p.crossMidnight ? { crossMidnight: true } : {})
      }));
      const displayHours = formatOpeningHourDisplay({
        day: dayItem.day,
        isOpen: true,
        periods
      });
      return {
        day: dayItem.day,
        isOpen: true,
        hours: displayHours,
        periods
      };
    });

    // 7. Persist to database
    const updatedBusiness = db.updateBusiness(business.id, {
      openingHours: cleanOpeningHours
    });

    // 8. Audit log
    auditService.log('BUSINESS_OPENING_HOURS_UPDATED', business.id, userId, 'merchant', {
      daysCount: cleanOpeningHours.length,
      openDaysCount: cleanOpeningHours.filter(d => d.isOpen).length
    });

    return {
      success: true,
      business: updatedBusiness,
      openingHours: cleanOpeningHours,
      message: 'Business opening hours updated successfully.'
    };
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.7: Clear Business Opening Hours
   */
  public async clearBusinessOpeningHours(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    message: string;
  }> {
    const user = db.getUserById(userId);
    if (!user || user.status === 'SUSPENDED') {
      throw new BusinessServiceError('User is not authorized or account is suspended.', 403, 'USER_SUSPENDED');
    }

    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    const isOwner = business.ownerId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business opening hours deletion attempt blocked (IDOR)',
          targetBusinessId: businessId,
          actualOwnerId: business.ownerId,
          action: 'CLEAR_BUSINESS_OPENING_HOURS'
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const updatedBusiness = db.updateBusiness(business.id, {
      openingHours: null as any
    });

    auditService.log('BUSINESS_OPENING_HOURS_CLEARED', business.id, userId, 'merchant', {});

    return {
      success: true,
      business: updatedBusiness,
      message: 'Business opening hours removed.'
    };
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.8: Get Business Contact Information
   * Public retrieval of business contact information (completely separated from user's personal profile)
   */
  public async getBusinessContactInfo(businessId: string): Promise<{
    success: boolean;
    businessId: string;
    contact: BusinessContactInfo;
  }> {
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    return {
      success: true,
      businessId: business.id,
      contact: {
        phone: business.phone,
        email: business.email,
        website: business.website
      }
    };
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.8: Update Business Contact Information
   * Allows business owner to manage business-level contact details (phone, email, website).
   * Enforces server-side IDOR defense, strict mass-assignment rejection, phone normalization,
   * email format validation, and safe URL protocol checks.
   */
  public async updateBusinessContactInfo(
    userId: string,
    businessId: string,
    payload: any,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    contact: BusinessContactInfo;
    message: string;
  }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED') {
      throw new BusinessServiceError('User is suspended.', 403, 'USER_SUSPENDED');
    }

    // 2. Verify business exists
    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 3. IDOR Defense: Business ownership check
    const isOwner = business.ownerId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    if (!isOwner && !isSuperAdmin) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business contact info modification attempt blocked (IDOR)',
          targetBusinessId: businessId,
          actualOwnerId: business.ownerId,
          action: 'UPDATE_BUSINESS_CONTACT_INFO'
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 4. Mass-assignment & Protected fields protection
    if (payload && typeof payload === 'object') {
      const extraProtectedFields = [
        ...PROTECTED_BUSINESS_FIELDS,
        'name', 'slug', 'logo', 'logoUrl', 'coverImageUrl', 'coverImageKey', 'logoKey',
        'description', 'categories', 'categoryIds', 'businessCategories', 'subcategories',
        'location', 'openingHours', 'products', 'services', 'portfolioItems', 'user', 'profile'
      ];
      for (const field of extraProtectedFields) {
        if (field in payload) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId,
            userEmail: user.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: 'Attempted modification of protected field during business contact update',
              businessId,
              attemptedField: field,
              action: 'UPDATE_BUSINESS_CONTACT_INFO'
            }
          });
          throw new BusinessServiceError(
            `Unauthorized attempt to set protected field: "${field}".`,
            403,
            'PRIVILEGE_ESCALATION_BLOCKED'
          );
        }
      }
    }

    // 5. Validate schema
    const schemaValidation = UpdateBusinessContactSchema.safeParse(payload || {});
    if (!schemaValidation.success) {
      const firstIssue = schemaValidation.error.issues[0];
      throw new BusinessServiceError(
        firstIssue?.message || 'Invalid business contact data.',
        400,
        'VALIDATION_ERROR',
        schemaValidation.error.issues
      );
    }

    // 6. Validate & normalize individual fields
    const updates: Partial<Business> = {};

    if (payload.phone !== undefined) {
      try {
        const normalizedPhone = validateAndNormalizeBusinessPhone(payload.phone);
        updates.phone = normalizedPhone === null ? '' : normalizedPhone;
      } catch (err: any) {
        throw new BusinessServiceError(err.message || 'Invalid phone number.', 400, 'VALIDATION_ERROR');
      }
    }

    if (payload.email !== undefined) {
      try {
        const normalizedEmail = validateAndNormalizeBusinessEmail(payload.email);
        updates.email = normalizedEmail === null ? '' : normalizedEmail;
      } catch (err: any) {
        throw new BusinessServiceError(err.message || 'Invalid contact email.', 400, 'VALIDATION_ERROR');
      }
    }

    if (payload.website !== undefined) {
      try {
        const normalizedWebsite = validateAndNormalizeBusinessWebsite(payload.website);
        updates.website = normalizedWebsite === null ? '' : normalizedWebsite;
      } catch (err: any) {
        throw new BusinessServiceError(err.message || 'Invalid website URL.', 400, 'VALIDATION_ERROR');
      }
    }

    // 7. Update business record
    const updatedBusiness = db.updateBusiness(business.id, updates);

    // 8. Security audit logging
    auditService.log('BUSINESS_CONTACT_UPDATED', business.id, userId, 'merchant', {
      updatedFields: Object.keys(updates),
      hasPhone: !!updatedBusiness.phone,
      hasEmail: !!updatedBusiness.email,
      hasWebsite: !!updatedBusiness.website
    });

    return {
      success: true,
      business: updatedBusiness,
      contact: {
        phone: updatedBusiness.phone,
        email: updatedBusiness.email,
        website: updatedBusiness.website
      },
      message: 'Business contact information updated successfully.'
    };
  }

  /**
   * Epic 2 Feature 2.2 Task 2.2.8: Clear Business Contact Information
   */
  public async clearBusinessContactInfo(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{
    success: boolean;
    business: Business;
    contact: BusinessContactInfo;
    message: string;
  }> {
    const user = db.getUserById(userId);
    if (!user || user.status === 'SUSPENDED') {
      throw new BusinessServiceError('User is not authorized or account is suspended.', 403, 'USER_SUSPENDED');
    }

    const business = db.getBusinessById(businessId);
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    const isOwner = business.ownerId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business contact deletion attempt blocked (IDOR)',
          targetBusinessId: businessId,
          actualOwnerId: business.ownerId,
          action: 'CLEAR_BUSINESS_CONTACT_INFO'
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to modify this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const updatedBusiness = db.updateBusiness(business.id, {
      phone: '',
      email: '',
      website: ''
    });

    auditService.log('BUSINESS_CONTACT_CLEARED', business.id, userId, 'merchant', {});

    return {
      success: true,
      business: updatedBusiness,
      contact: {
        phone: undefined,
        email: undefined,
        website: undefined
      },
      message: 'Business contact information cleared successfully.'
    };
  }
}

export const businessService = new BusinessService();
