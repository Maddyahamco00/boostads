/**
 * Business Service (Epic 2 Feature 2.2 Task 2.2.1)
 * 
 * Handles business creation, owner binding, validation, and storage synchronization.
 */

import { db, DatabaseUniqueConstraintError, DatabaseValidationError, isDesignatedSuperAdminEmail } from '../db';
import { authService } from './authService';
import { auditService } from './auditService';
import { storageService } from './storageService';
import { CreateBusinessSchema, UpdateBusinessDescriptionSchema, UpdateBusinessCategoriesSchema, SelectBusinessCategorySchema, UpdateBusinessLocationSchema, UpdateOpeningHoursSchema, OpeningHoursArraySchema, UpdateBusinessContactSchema, validateAndNormalizeBusinessPhone, validateAndNormalizeBusinessEmail, validateAndNormalizeBusinessWebsite, PROTECTED_BUSINESS_FIELDS, SubmitVerificationRequestSchema, validateNoVerificationPrivilegeEscalation, validateBusinessVerificationEligibility, BusinessSearchQuerySchema, sanitizeSearchQuery } from '../validators/businessValidators';
import { Business, Category, CategoryConfig, BusinessCategory, LocationCoordinates, OpeningHour, formatOpeningHourDisplay, BusinessContactInfo, PublicBusinessProfile, BusinessVerificationRequest, PublicVerificationRequestDTO, BusinessVerificationStatus, BusinessVerificationStatusResponse, BusinessSearchResponse } from '../../types';

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
   * Helper to validate and resolve category & subcategory against database taxonomy (Epic 3 Task 3.1.4)
   */
  public resolveAndValidateCategorySelection(
    categoryIdOrSlug: string,
    subcategoryIdOrTag?: string | null
  ): {
    category: Category;
    subcategoryId?: string;
    subcategoryName?: string;
  } {
    const catConfig = db.getCategoryById(categoryIdOrSlug);
    if (!catConfig) {
      throw new BusinessServiceError(`Invalid category: "${categoryIdOrSlug}" does not exist.`, 400, 'CATEGORY_NOT_FOUND');
    }
    if (catConfig.active === false || catConfig.status === 'inactive') {
      throw new BusinessServiceError(`Category "${catConfig.name || categoryIdOrSlug}" is currently inactive and cannot be selected.`, 400, 'CATEGORY_INACTIVE');
    }

    let resolvedSubcategoryId: string | undefined;
    let resolvedSubcategoryName: string | undefined;

    if (subcategoryIdOrTag && typeof subcategoryIdOrTag === 'string' && subcategoryIdOrTag.trim()) {
      const trimmedSub = subcategoryIdOrTag.trim();
      const childCat = db.getCategoryById(trimmedSub) ||
        db.categories.find(c =>
          (c.parentId === catConfig.id || c.parentId === catConfig.slug) &&
          c.name.trim().toLowerCase() === trimmedSub.toLowerCase()
        );

      if (childCat) {
        // Must belong to this parent category
        const isChildOfParent = childCat.parentId === catConfig.id || childCat.parentId === catConfig.slug;
        if (!isChildOfParent) {
          throw new BusinessServiceError(
            `The selected subcategory "${childCat.name || trimmedSub}" does not belong to category "${catConfig.name}".`,
            400,
            'SUBCATEGORY_MISMATCH'
          );
        }
        if (childCat.active === false || childCat.status === 'inactive') {
          throw new BusinessServiceError(
            `Subcategory "${childCat.name || trimmedSub}" is currently inactive and cannot be selected.`,
            400,
            'SUBCATEGORY_INACTIVE'
          );
        }
        resolvedSubcategoryId = childCat.id;
        resolvedSubcategoryName = childCat.name;
      } else {
        // Check if matching tag in parent category's subcategories list
        const matchedTag = (catConfig.subcategories || []).find(
          t => t.toLowerCase() === trimmedSub.toLowerCase() ||
               t.toLowerCase().replace(/[^a-z0-9]+/g, '-') === trimmedSub.toLowerCase()
        );

        if (matchedTag) {
          resolvedSubcategoryId = matchedTag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          resolvedSubcategoryName = matchedTag;
        } else {
          // Check if it belongs to any other category to provide an exact mismatch error
          const anyOtherCategory = db.categories.find(c =>
            c.id !== catConfig.id &&
            c.slug !== catConfig.slug &&
            c.subcategories &&
            c.subcategories.some(t => t.toLowerCase() === trimmedSub.toLowerCase())
          );
          if (anyOtherCategory) {
            throw new BusinessServiceError(
              `The selected subcategory "${trimmedSub}" does not belong to category "${catConfig.name}".`,
              400,
              'SUBCATEGORY_MISMATCH'
            );
          }
          throw new BusinessServiceError(
            `Invalid subcategory: "${trimmedSub}" does not exist or does not belong to category "${catConfig.name}".`,
            400,
            'SUBCATEGORY_NOT_FOUND'
          );
        }
      }
    }

    return {
      category: catConfig,
      subcategoryId: resolvedSubcategoryId,
      subcategoryName: resolvedSubcategoryName
    };
  }

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

    const { name, description, categoryId, category, subcategoryId, subcategory, subcategories, categoryIds, location } = parseResult.data;

    let primaryCatConfig: Category | undefined;
    let resolvedSubcategoryId: string | undefined;
    let resolvedSubcategoryName: string | undefined;

    const primaryCatId = categoryId || category || (categoryIds && categoryIds.length > 0 ? categoryIds[0] : undefined);
    const rawSubcategory = subcategoryId || subcategory || (subcategories && subcategories.length > 0 ? subcategories[0] : undefined);

    if (primaryCatId) {
      const resolved = this.resolveAndValidateCategorySelection(primaryCatId, rawSubcategory);
      primaryCatConfig = resolved.category;
      resolvedSubcategoryId = resolved.subcategoryId;
      resolvedSubcategoryName = resolved.subcategoryName;
    }

    // Validate additional category IDs if provided
    if (categoryIds && categoryIds.length > 0) {
      for (const catId of categoryIds) {
        const catConfig = db.getCategoryById(catId);
        if (!catConfig) {
          throw new BusinessServiceError(`Invalid category: "${catId}" does not exist.`, 400, 'CATEGORY_NOT_FOUND');
        }
        if (catConfig.active === false || catConfig.status === 'inactive') {
          throw new BusinessServiceError(`Category "${catConfig.name || catId}" is currently inactive.`, 400, 'CATEGORY_INACTIVE');
        }
      }
    }

    const now = new Date().toISOString();
    const id = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const slug = generateBusinessSlug(name);

    const initialCategories = primaryCatConfig
      ? (categoryIds && categoryIds.length > 0 ? categoryIds : [primaryCatConfig.id])
      : (categoryIds || []);

    const newBiz: Business = {
      id,
      ownerId: userId,
      name,
      slug,
      ...(description ? { description } : {}),
      categoryId: primaryCatConfig ? primaryCatConfig.id : undefined,
      category: primaryCatConfig ? (primaryCatConfig.id as any) : undefined,
      categoryLabel: primaryCatConfig ? primaryCatConfig.name : undefined,
      subcategoryId: resolvedSubcategoryId,
      subcategoryName: resolvedSubcategoryName,
      subcategory: resolvedSubcategoryName || resolvedSubcategoryId,
      categories: initialCategories,
      subcategories: resolvedSubcategoryName ? [resolvedSubcategoryName] : (subcategories || []),
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

    if (initialCategories.length > 0) {
      db.setBusinessCategories(newBiz.id, initialCategories as string[]);
    }

    // 6. Record audit event
    auditService.log('BUSINESS_CREATED', id, userId, 'merchant', {
      businessName: name,
      categoryId: newBiz.categoryId,
      subcategoryId: newBiz.subcategoryId,
      categoryIds: initialCategories
    });

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

    // 5. Normalize & validate payload
    const normalizedPayload = Array.isArray(payload) ? { categoryIds: payload } : payload;
    const parseResult = UpdateBusinessCategoriesSchema.safeParse(normalizedPayload);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      throw new BusinessServiceError(
        firstIssue?.message || 'Invalid category selection.',
        400,
        'VALIDATION_ERROR',
        parseResult.error.issues
      );
    }

    const data = parseResult.data;
    const targetCatId = data.categoryId || data.category;
    const targetSubcategory = data.subcategoryId !== undefined ? data.subcategoryId : data.subcategory;

    let updatedCategoryIds: string[] = [];

    if (targetCatId) {
      // Direct category & subcategory selection (Task 3.1.4)
      const resolved = this.resolveAndValidateCategorySelection(targetCatId, targetSubcategory);

      business.categoryId = resolved.category.id;
      business.category = resolved.category.id as any;
      business.categoryLabel = resolved.category.name;
      business.subcategoryId = resolved.subcategoryId;
      business.subcategoryName = resolved.subcategoryName;
      business.subcategory = resolved.subcategoryName || resolved.subcategoryId;
      business.subcategories = resolved.subcategoryName ? [resolved.subcategoryName] : [];
      business.categories = [resolved.category.id];
      updatedCategoryIds = [resolved.category.id];

      db.setBusinessCategories(business.id, updatedCategoryIds);
    } else if (data.categoryIds !== undefined) {
      // Array-based category update (Task 2.2.5 backward-compatibility)
      if (data.categoryIds.length === 0) {
        // Clear categories and subcategory
        business.categoryId = undefined;
        business.category = undefined;
        business.categoryLabel = undefined;
        business.subcategoryId = undefined;
        business.subcategoryName = undefined;
        business.subcategory = undefined;
        business.subcategories = [];
        business.categories = [];
        updatedCategoryIds = [];
        db.clearBusinessCategories(business.id);
      } else {
        // Validate all category IDs
        for (const catId of data.categoryIds) {
          const catConfig = db.getCategoryById(catId);
          if (!catConfig) {
            throw new BusinessServiceError(
              `Invalid category: "${catId}" does not exist. Please select from available categories.`,
              400,
              'CATEGORY_NOT_FOUND'
            );
          }
          if (catConfig.active === false || catConfig.status === 'inactive') {
            throw new BusinessServiceError(
              `Category "${catConfig.name || catId}" is currently inactive and cannot be assigned.`,
              400,
              'CATEGORY_INACTIVE'
            );
          }
        }

        const primaryCat = db.getCategoryById(data.categoryIds[0])!;
        const previousCatId = business.categoryId || (business.categories && business.categories.length > 0 ? business.categories[0] : undefined);
        const categoryChanged = previousCatId !== primaryCat.id;

        business.categoryId = primaryCat.id;
        business.category = primaryCat.id as any;
        business.categoryLabel = primaryCat.name;
        business.categories = data.categoryIds;
        updatedCategoryIds = data.categoryIds;

        // If target subcategory was explicitly provided, validate and attach it
        if (targetSubcategory && targetSubcategory.trim()) {
          const resolved = this.resolveAndValidateCategorySelection(primaryCat.id, targetSubcategory);
          business.subcategoryId = resolved.subcategoryId;
          business.subcategoryName = resolved.subcategoryName;
          business.subcategory = resolved.subcategoryName || resolved.subcategoryId;
          business.subcategories = resolved.subcategoryName ? [resolved.subcategoryName] : [];
        } else if (categoryChanged) {
          // Reset previous subcategory so invalid combination cannot persist!
          business.subcategoryId = undefined;
          business.subcategoryName = undefined;
          business.subcategory = undefined;
          business.subcategories = [];
        }

        db.setBusinessCategories(business.id, updatedCategoryIds);
      }
    }

    business.updatedAt = new Date().toISOString();
    db.businesses.set(business.id, business);

    // Record audit event
    auditService.log('BUSINESS_CATEGORIES_UPDATED', business.id, userId, 'merchant', {
      categoryId: business.categoryId,
      subcategoryId: business.subcategoryId,
      categoryIds: updatedCategoryIds
    });

    const updatedBiz = db.getBusinessById(business.id) || business;

    return {
      success: true,
      business: updatedBiz,
      categoryIds: updatedCategoryIds,
      businessCategories: updatedBiz.businessCategories || [],
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

  /**
   * Epic 2 Feature 2.2 Task 2.2.9: Get Public Business Profile
   * 
   * Strict public access specifications:
   * - Publicly readable by anyone without authentication.
   * - Resolves business by stable slug or ID.
   * - Validates business exists and owner account is active (not suspended or deactivated).
   * - Returns ONLY approved public business fields (DTO projection).
   * - Strictly eliminates all sensitive data:
   *   - No ownerId, passwords, password hashes, auth tokens, session details.
   *   - No storage keys (logoKey, coverImageKey).
   *   - No private owner phone/email (only business-level contact configured).
   *   - No internal analytics/revenue stats, billing info, or administrative metadata.
   *   - No unverified badges (isVerified is false unless verified).
   *   - No fake products, reviews, or ratings.
   */
  public async getPublicBusinessProfile(idOrSlug: string): Promise<{
    success: boolean;
    business: PublicBusinessProfile;
  }> {
    if (!idOrSlug || !idOrSlug.trim()) {
      throw new BusinessServiceError('Business identifier or slug is required.', 400, 'INVALID_IDENTIFIER');
    }

    const trimmed = idOrSlug.trim();
    const business = db.getBusinessByIdOrSlug(trimmed);

    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // Business Visibility Rule: Verify owner status if owner exists
    if (business.ownerId) {
      const owner = db.getUserById(business.ownerId);
      if (owner && (owner.status === 'SUSPENDED' || owner.status === 'DISABLED' || owner.status === 'DELETED')) {
        throw new BusinessServiceError('This business is currently unavailable.', 404, 'BUSINESS_UNAVAILABLE');
      }
    }

    // Safely record view count in background without exposing stats to public
    try {
      if (!business.stats) {
        business.stats = { views: 1, leads: 0, conversions: 0, totalRevenue: 0 };
      } else {
        business.stats.views = (business.stats.views || 0) + 1;
      }
    } catch {
      // Non-fatal metric update
    }

    // Project strictly approved public fields
    const publicProfile: PublicBusinessProfile = toPublicBusinessProfile(business);

    return {
      success: true,
      business: publicProfile
    };
  }

  /**
   * Public Business Search (Epic 3 Feature 3.2 Task 3.2.1)
   * 
   * Searches businesses by name, description, relational category name, subcategory name, and location.
   * Enforces public visibility, excludes private owner account details, handles safe sanitization,
   * relevance ranking, and server-side pagination.
   */
  public async searchBusinesses(queryParams: {
    q?: unknown;
    query?: unknown;
    search?: unknown;
    page?: unknown;
    limit?: unknown;
  }): Promise<BusinessSearchResponse> {
    const rawQuery = queryParams.q ?? queryParams.query ?? queryParams.search;

    const parsed = BusinessSearchQuerySchema.safeParse({
      q: rawQuery,
      page: queryParams.page,
      limit: queryParams.limit
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid search query.';
      const isTooLong = parsed.error.issues.some(i => i.message.includes('100'));
      const isRequiredOrEmpty = parsed.error.issues.some(i => i.message.includes('required') || i.message.includes('empty'));
      const code = isTooLong ? 'SEARCH_QUERY_TOO_LONG' : (isRequiredOrEmpty ? 'EMPTY_SEARCH_QUERY' : 'INVALID_SEARCH_QUERY');
      throw new BusinessServiceError(errorMsg, 400, code);
    }

    const { q, page, limit } = parsed.data;
    const normalizedQuery = q.toLowerCase();
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    // Build category map from database to look up category names relationally without data duplication
    const categoryMap = new Map<string, Category>();
    for (const cat of db.categories) {
      if (cat.id) categoryMap.set(cat.id.toLowerCase(), cat);
      if (cat.slug) categoryMap.set(cat.slug.toLowerCase(), cat);
    }

    interface ScoredBusiness {
      business: Business;
      score: number;
    }

    const matched: ScoredBusiness[] = [];

    // Query businesses in database
    for (const business of db.businesses.values()) {
      // 1. Visibility Check: exclude businesses whose owner is suspended, disabled, or deleted
      if (business.ownerId) {
        const owner = db.getUserById(business.ownerId);
        if (owner && (owner.status === 'SUSPENDED' || owner.status === 'DISABLED' || owner.status === 'DELETED')) {
          continue;
        }
      }

      // 2. Relational Category Names (Never duplicated onto business records purely for search)
      const categoryNames: string[] = [];
      const subcategoryNames: string[] = [];

      // Primary Category
      if (business.categoryId) {
        const cat = categoryMap.get(business.categoryId.toLowerCase());
        if (cat) categoryNames.push(cat.name);
      } else if (business.category) {
        const cat = categoryMap.get(String(business.category).toLowerCase());
        if (cat) categoryNames.push(cat.name);
        else categoryNames.push(String(business.category));
      }

      // Multiple categories if defined
      if (Array.isArray(business.categories)) {
        for (const catId of business.categories) {
          const cat = categoryMap.get(String(catId).toLowerCase());
          if (cat && !categoryNames.includes(cat.name)) {
            categoryNames.push(cat.name);
          }
        }
      }

      // Business categories join table
      const joinRecords = db.getBusinessCategories(business.id);
      for (const jr of joinRecords) {
        const cat = categoryMap.get(jr.categoryId.toLowerCase());
        if (cat && !categoryNames.includes(cat.name)) {
          categoryNames.push(cat.name);
        }
      }

      // Subcategories
      if (business.subcategoryId) {
        const subCat = categoryMap.get(business.subcategoryId.toLowerCase());
        if (subCat) {
          subcategoryNames.push(subCat.name);
        }
      }
      if (business.subcategoryName) {
        if (!subcategoryNames.includes(business.subcategoryName)) {
          subcategoryNames.push(business.subcategoryName);
        }
      }
      if (business.subcategory) {
        if (!subcategoryNames.includes(business.subcategory)) {
          subcategoryNames.push(business.subcategory);
        }
      }
      if (Array.isArray(business.subcategories)) {
        for (const sc of business.subcategories) {
          if (sc && !subcategoryNames.includes(sc)) {
            subcategoryNames.push(sc);
          }
        }
      }

      // Search fields
      const name = (business.name || '').toLowerCase();
      const description = (business.description || '').toLowerCase();
      const catText = categoryNames.join(' ').toLowerCase();
      const subcatText = subcategoryNames.join(' ').toLowerCase();
      const cityText = (business.location?.city || '').toLowerCase();
      const stateText = (business.location?.state || '').toLowerCase();
      const lgaText = (business.location?.lga || '').toLowerCase();

      // Check matches
      const exactNameMatch = name === normalizedQuery;
      const prefixNameMatch = name.startsWith(normalizedQuery);
      const partialNameMatch = name.includes(normalizedQuery);
      const partialDescMatch = description.includes(normalizedQuery);
      const partialCatMatch = catText.includes(normalizedQuery);
      const partialSubcatMatch = subcatText.includes(normalizedQuery);
      const partialLocationMatch = cityText.includes(normalizedQuery) || stateText.includes(normalizedQuery) || lgaText.includes(normalizedQuery);

      let isMatch = exactNameMatch || prefixNameMatch || partialNameMatch || partialDescMatch || partialCatMatch || partialSubcatMatch || partialLocationMatch;

      // Multi-word token matching (all words match across combined fields)
      if (!isMatch && queryTokens.length > 1) {
        const combinedText = `${name} ${description} ${catText} ${subcatText} ${cityText} ${stateText} ${lgaText}`;
        isMatch = queryTokens.every(tok => combinedText.includes(tok));
      }

      if (!isMatch) continue;

      // Calculate relevance score
      let score = 0;
      if (exactNameMatch) score += 100;
      else if (prefixNameMatch) score += 60;
      else if (partialNameMatch) score += 40;

      if (partialCatMatch) score += 30;
      if (partialSubcatMatch) score += 30;
      if (partialDescMatch) score += 15;
      if (partialLocationMatch) score += 10;

      // Quality / verification boosts
      if (business.isVerified) score += 10;
      if (business.tier === 'enterprise') score += 5;
      else if (business.tier === 'pro') score += 3;

      matched.push({ business, score });
    }

    // Sort by relevance score descending, then rating, then name
    matched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bRating = b.business.rating || 0;
      const aRating = a.business.rating || 0;
      if (bRating !== aRating) return bRating - aRating;
      return a.business.name.localeCompare(b.business.name);
    });

    const total = matched.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedSlice = matched.slice(startIndex, startIndex + limit);

    const publicBusinesses = paginatedSlice.map(item => toPublicBusinessProfile(item.business));

    return {
      success: true,
      businesses: publicBusinesses,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Submit a business verification request (Epic 2 Feature 2.3 Task 2.3.1)
   * 
   * Strict security checks:
   * 1. Authenticated user must exist and have active status (not suspended/disabled/deleted).
   * 2. Business must exist in database.
   * 3. IDOR Protection: authenticated user must be the business owner (or designated Super Admin).
   * 4. Eligibility check: business cannot already be verified.
   * 5. One Active Request Constraint: business cannot already have a PENDING request.
   * 6. Concurrency / Transaction isolation: executed in db.transaction to block race conditions.
   * 7. Mass-assignment & Privilege escalation rejection: client cannot set status, reviewer, timestamps, or flags.
   * 8. Sanitized output: returns safe DTO without internal administrative information.
   */
  public async submitVerificationRequest(
    userId: string,
    businessId: string,
    payload?: { notes?: string | null },
    clientIp: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<{ success: boolean; message: string; request: PublicVerificationRequestDTO }> {
    // 1. Verify user exists and is active
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DISABLED' || user.status === 'DELETED') {
      throw new BusinessServiceError('Suspended or inactive accounts cannot submit verification requests.', 403, 'ACCOUNT_INACTIVE');
    }

    if (user.role !== 'CLIENT' && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Only business owners can submit verification requests.', 403, 'FORBIDDEN');
    }

    // 2. Validate business ID
    if (!businessId || typeof businessId !== 'string' || !businessId.trim()) {
      throw new BusinessServiceError('Invalid business identifier.', 400, 'INVALID_BUSINESS_ID');
    }

    // 3. Fetch business
    const business = db.getBusinessById(businessId.trim());
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    // 4. Strict Server-Side Ownership Check (Anti-IDOR)
    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business verification submission attempt blocked',
          businessId: business.id,
          actualOwnerId: business.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to submit verification for this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    // 5. Check if business is already verified
    if (business.isVerified) {
      throw new BusinessServiceError('This business is already verified.', 400, 'ALREADY_VERIFIED');
    }

    // 5b. Verify Business Profile Eligibility (Epic 2 Feature 2.3 Task 2.3.1)
    const eligibility = validateBusinessVerificationEligibility(business);
    if (!eligibility.eligible) {
      throw new BusinessServiceError(
        eligibility.message || 'Business profile is incomplete. Please complete all required information before requesting verification.',
        400,
        'INELIGIBLE_PROFILE',
        {
          missingFields: eligibility.missingFields,
          fieldErrors: eligibility.fieldErrors
        }
      );
    }

    // 6. Pre-check: one active PENDING request constraint
    const existingPending = db.getActivePendingVerificationRequest(business.id);
    if (existingPending) {
      throw new BusinessServiceError(
        'A verification request is already pending review for this business.',
        409,
        'PENDING_REQUEST_EXISTS',
        { existingRequestId: existingPending.id, submittedAt: existingPending.submittedAt }
      );
    }

    // 7. Sanitize notes
    let sanitizedNotes: string | undefined = undefined;
    if (payload?.notes && typeof payload.notes === 'string') {
      sanitizedNotes = payload.notes
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();
      if (sanitizedNotes.length > 500) {
        throw new BusinessServiceError('Verification notes cannot exceed 500 characters.', 400, 'VALIDATION_ERROR');
      }
      if (!sanitizedNotes) {
        sanitizedNotes = undefined;
      }
    }

    // 8. Atomic execution inside db.transaction mutex to prevent concurrent duplicate submissions
    const createdRequest = await db.transaction(async () => {
      // Re-check atomic invariant inside lock
      const concurrentPending = db.getActivePendingVerificationRequest(business.id);
      if (concurrentPending) {
        throw new BusinessServiceError(
          'A verification request is already pending review for this business.',
          409,
          'PENDING_REQUEST_EXISTS'
        );
      }

      return db.createVerificationRequest({
        businessId: business.id,
        requesterId: user.id,
        notes: sanitizedNotes
      });
    });

    // 9. Audit log
    authService.logSecurityEvent('BUSINESS_VERIFICATION_REQUESTED' as any, {
      userId: user.id,
      userEmail: user.email,
      ipAddress: clientIp,
      userAgent,
      details: {
        businessId: business.id,
        requestId: createdRequest.id,
        status: createdRequest.status
      }
    });

    // 10. Return sanitized DTO (explicit whitelist, no reviewerId, no internal flags)
    const dto: PublicVerificationRequestDTO = {
      id: createdRequest.id,
      businessId: createdRequest.businessId,
      status: createdRequest.status,
      submittedAt: createdRequest.submittedAt,
      createdAt: createdRequest.createdAt,
      notes: createdRequest.notes
    };

    return {
      success: true,
      message: 'Verification request submitted successfully. Our team will review your business details.',
      request: dto
    };
  }

  /**
   * Get server-controlled verification status for an owned business (Epic 2 Feature 2.3 Tasks 2.3.1 & 2.3.2)
   * Enforces:
   * - Authentication
   * - Anti-IDOR (Owner only, or SUPER_ADMIN)
   * - Server-controlled state calculation: NOT_SUBMITTED, PENDING, APPROVED, REJECTED
   * - Sensitive admin info masking (no reviewerId, no internal flags)
   */
  public async getLatestVerificationRequest(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<BusinessVerificationStatusResponse> {
    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (!businessId || typeof businessId !== 'string' || !businessId.trim()) {
      throw new BusinessServiceError('Invalid business identifier.', 400, 'INVALID_BUSINESS_ID');
    }

    const business = db.getBusinessById(businessId.trim());
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId,
        userEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          reason: 'Cross-business verification status read attempt blocked',
          businessId: business.id,
          actualOwnerId: business.ownerId
        }
      });
      throw new BusinessServiceError('Forbidden: You are not authorized to view verification requests for this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const pending = db.getActivePendingVerificationRequest(business.id);
    const requests = db.getVerificationRequestsByBusinessId(business.id);
    const latest = pending || requests[0] || null;

    let overallStatus: BusinessVerificationStatus = 'NOT_SUBMITTED';

    if (business.isVerified) {
      overallStatus = 'APPROVED';
    } else if (pending) {
      overallStatus = 'PENDING';
    } else if (latest) {
      if (latest.status === 'APPROVED') {
        overallStatus = 'APPROVED';
      } else if (latest.status === 'REJECTED') {
        overallStatus = 'REJECTED';
      } else if (latest.status === 'PENDING') {
        overallStatus = 'PENDING';
      } else {
        overallStatus = 'NOT_SUBMITTED';
      }
    } else {
      overallStatus = 'NOT_SUBMITTED';
    }

    // Keep business.verificationStatus in sync
    if (business.verificationStatus !== overallStatus) {
      business.verificationStatus = overallStatus;
      db.updateBusiness(business.id, { verificationStatus: overallStatus });
    }

    const isVerified = overallStatus === 'APPROVED';
    const canResubmit = overallStatus === 'NOT_SUBMITTED' || overallStatus === 'REJECTED';

    const dto: PublicVerificationRequestDTO | null = latest ? {
      id: latest.id,
      businessId: latest.businessId,
      status: latest.status,
      submittedAt: latest.submittedAt,
      reviewedAt: latest.reviewedAt,
      rejectionReason: latest.status === 'REJECTED' ? latest.rejectionReason : undefined,
      createdAt: latest.createdAt,
      notes: latest.notes
    } : null;

    return {
      success: true,
      businessId: business.id,
      status: overallStatus,
      isVerified,
      canResubmit,
      request: dto
    };
  }

  /**
   * Alias for getLatestVerificationRequest to provide clean semantic naming
   */
  public async getBusinessVerificationStatus(
    userId: string,
    businessId: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<BusinessVerificationStatusResponse> {
    return this.getLatestVerificationRequest(userId, businessId, clientIp, userAgent);
  }

  /**
   * Check business profile verification eligibility (Epic 2 Feature 2.3 Task 2.3.1)
   */
  public checkVerificationEligibility(
    userId: string,
    businessId: string
  ): {
    success: boolean;
    businessId: string;
    eligible: boolean;
    missingFields: string[];
    fieldErrors: Record<string, string>;
    message: string;
  } {
    if (!businessId || typeof businessId !== 'string' || !businessId.trim()) {
      throw new BusinessServiceError('Invalid business identifier.', 400, 'INVALID_BUSINESS_ID');
    }

    const business = db.getBusinessById(businessId.trim());
    if (!business) {
      throw new BusinessServiceError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    const user = db.getUserById(userId);
    if (!user) {
      throw new BusinessServiceError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (business.ownerId !== userId && (user.role as string) !== 'SUPER_ADMIN') {
      throw new BusinessServiceError('Forbidden: You are not authorized to check eligibility for this business.', 403, 'FORBIDDEN_NOT_OWNER');
    }

    const eligibility = validateBusinessVerificationEligibility(business);
    return {
      success: true,
      businessId: business.id,
      eligible: eligibility.eligible,
      missingFields: eligibility.missingFields,
      fieldErrors: eligibility.fieldErrors,
      message: eligibility.message
    };
  }

  /**
   * Controlled Server-side Verification Review (Super Admin Only - Task 2.3.2 state transitions)
   * Lifecycle transitions strictly enforced:
   * PENDING -> APPROVED | REJECTED
   */
  public async reviewVerificationRequest(
    adminUserId: string,
    requestId: string,
    decision: {
      status: 'APPROVED' | 'REJECTED';
      rejectionReason?: string;
    },
    clientIp: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<{ success: boolean; message: string; request: BusinessVerificationRequest }> {
    const admin = db.getUserById(adminUserId);
    if (!admin || admin.role !== 'SUPER_ADMIN' || admin.status !== 'ACTIVE' || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new BusinessServiceError('Forbidden: Super Admin privileges required.', 403, 'FORBIDDEN_ADMIN_REQUIRED');
    }

    if (!requestId || typeof requestId !== 'string' || !requestId.trim()) {
      throw new BusinessServiceError('Invalid verification request ID.', 400, 'INVALID_REQUEST_ID');
    }

    const req = db.getVerificationRequestById(requestId.trim());
    if (!req) {
      throw new BusinessServiceError('Verification request not found.', 404, 'NOT_FOUND');
    }

    if (req.status !== 'PENDING') {
      throw new BusinessServiceError(`Cannot review verification request with status ${req.status}. Must be PENDING.`, 409, 'STALE_OPERATION_CONFLICT');
    }

    if (decision.status !== 'APPROVED' && decision.status !== 'REJECTED') {
      throw new BusinessServiceError('Decision status must be APPROVED or REJECTED.', 400, 'INVALID_DECISION_STATUS');
    }

    let sanitizedRejectionReason: string | undefined;
    if (decision.status === 'REJECTED') {
      if (!decision.rejectionReason || !decision.rejectionReason.trim()) {
        throw new BusinessServiceError('A rejection reason is required when rejecting a verification request.', 400, 'REJECTION_REASON_REQUIRED');
      }
      const trimmed = decision.rejectionReason.trim();
      if (trimmed.length < 3) {
        throw new BusinessServiceError('Rejection reason must be at least 3 characters long.', 400, 'INVALID_REJECTION_REASON');
      }
      if (trimmed.length > 500) {
        throw new BusinessServiceError('Rejection reason must not exceed 500 characters.', 400, 'INVALID_REJECTION_REASON');
      }
      sanitizedRejectionReason = trimmed;
    }

    const now = new Date().toISOString();
    const updated = db.updateVerificationRequest(
      req.id,
      {
        status: decision.status,
        reviewedAt: now,
        reviewerId: admin.id,
        rejectionReason: decision.status === 'REJECTED' ? sanitizedRejectionReason : undefined
      },
      'PENDING'
    );

    authService.logSecurityEvent('ADMIN_ACTION', {
      userId: admin.id,
      userEmail: admin.email,
      ipAddress: clientIp,
      userAgent,
      details: {
        action: decision.status === 'APPROVED' ? 'BUSINESS_VERIFICATION_APPROVED' : 'BUSINESS_VERIFICATION_REJECTED',
        requestId: req.id,
        businessId: req.businessId,
        decision: decision.status,
        rejectionReason: decision.status === 'REJECTED' ? sanitizedRejectionReason : undefined
      }
    });

    return {
      success: true,
      message: `Verification request ${decision.status.toLowerCase()} successfully.`,
      request: updated
    };
  }
}

export const businessService = new BusinessService();

/**
 * Project strictly approved public fields for public business profile.
 * Explicitly excludes ownerId, private credentials, storage keys, internal metrics, and masks address if isServiceAreaOnly.
 */
export function toPublicBusinessProfile(business: Business): PublicBusinessProfile {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    tagline: business.tagline || undefined,
    description: business.description || undefined,
    logoUrl: business.logoUrl || undefined,
    coverImageUrl: business.coverImageUrl || undefined,
    category: business.category || undefined,
    categoryId: business.categoryId || undefined,
    categoryLabel: business.categoryLabel || undefined,
    subcategoryId: business.subcategoryId || undefined,
    subcategoryName: business.subcategoryName || undefined,
    subcategory: business.subcategory || undefined,
    categories: business.categories && business.categories.length > 0 ? business.categories : undefined,
    subcategories: business.subcategories && business.subcategories.length > 0 ? business.subcategories : undefined,
    location: business.location ? {
      city: business.location.city,
      state: business.location.state,
      country: business.location.country,
      address: business.location.isServiceAreaOnly ? undefined : (business.location.address || undefined),
      lga: business.location.lga || undefined,
      postalCode: business.location.isServiceAreaOnly ? undefined : (business.location.postalCode || undefined),
      serviceAreaKm: business.location.serviceAreaKm || undefined,
      isServiceAreaOnly: business.location.isServiceAreaOnly || undefined,
      lat: business.location.lat,
      lng: business.location.lng,
    } : undefined,
    openingHours: business.openingHours && business.openingHours.length > 0 ? business.openingHours : undefined,
    phone: business.phone || undefined,
    email: business.email || undefined,
    website: business.website || undefined,
    isVerified: Boolean(business.isVerified),
    createdAt: business.createdAt
  };
}
