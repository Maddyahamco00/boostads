import { Category, CategoryTreeNode, CreateCategoryInput, CreateSubcategoryInput, UpdateCategoryInput } from '../../types';
import { db, isDesignatedSuperAdminEmail } from '../db';
import { auditService } from './auditService';
import { 
  validateCreateCategoryPayload,
  validateCreateSubcategoryPayload, 
  validateAddSubcategoryItemPayload,
  validateUpdateCategoryPayload,
  validateUpdateCategoryStatusPayload
} from '../validators/categoryValidators';

export class CategoryServiceError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'CategoryServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class CategoryService {
  /**
   * Public query for active system categories (Section 10 & 11)
   */
  public getAvailableCategories(includeInactive: boolean = false, parentId?: string | null): Category[] {
    return db.getAllCategories({
      status: includeInactive ? 'all' : 'active',
      parentId
    });
  }

  /**
   * Public query for top-level categories (Epic 3 Feature 3.1 Task 3.1.2)
   */
  public getTopLevelCategories(includeInactive: boolean = false): Category[] {
    return db.getTopLevelCategories({
      status: includeInactive ? 'all' : 'active'
    });
  }

  /**
   * Public query for subcategories under a specific parent category
   */
  public getSubcategories(parentId: string, includeInactive: boolean = false): Category[] {
    try {
      return db.getSubcategories(parentId, {
        status: includeInactive ? 'all' : 'active'
      });
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || `Failed to fetch subcategories for "${parentId}".`,
        err.statusCode || 400,
        err.code || 'SUBCATEGORIES_FETCH_FAILED'
      );
    }
  }

  /**
   * Public retrieval of complete hierarchical Category Tree (Epic 3 Feature 3.1 Task 3.1.2)
   */
  public getCategoryTree(includeInactive: boolean = false): CategoryTreeNode[] {
    return db.getCategoryTree({
      status: includeInactive ? 'all' : 'active'
    });
  }

  /**
   * Public retrieval of a single category by its stable ID or slug (Section 2 & 10)
   */
  public getCategoryByIdOrSlug(idOrSlug: string): Category | null {
    const category = db.getCategoryById(idOrSlug);
    return category || null;
  }

  /**
   * Super Admin subcategory creation (Epic 3 Feature 3.1 Task 3.1.2)
   * Strictly verifies caller is designated Super Admin (maddyahamco00@gmail.com).
   * CLIENT users are strictly forbidden (403).
   */
  public async createSubcategory(
    adminUserId: string,
    parentId: string,
    payload: unknown,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<Category> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can create subcategories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    const validation = validateCreateSubcategoryPayload(parentId, payload);
    if (!validation.success || !validation.data) {
      const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid subcategory payload';
      throw new CategoryServiceError(msg, 400, 'VALIDATION_ERROR', validation.errors);
    }

    try {
      const created = db.createCategory(validation.data as CreateSubcategoryInput);

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: 'SUBCATEGORY_CREATED',
          adminEmail: admin.email,
          parentId,
          categoryId: created.id,
          categoryName: created.name,
          slug: created.slug,
          clientIp,
          userAgent
        }
      );

      return created;
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to create subcategory.',
        err.statusCode || 400,
        err.code || 'SUBCATEGORY_CREATION_FAILED',
        err.details
      );
    }
  }

  /**
   * Super Admin adds a subcategory string tag to a parent category
   */
  public async addSubcategoryTag(
    adminUserId: string,
    parentId: string,
    tagName: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<Category> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can manage subcategories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    const validation = validateAddSubcategoryItemPayload({ name: tagName });
    if (!validation.success || !validation.data) {
      const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid subcategory tag name';
      throw new CategoryServiceError(msg, 400, 'VALIDATION_ERROR', validation.errors);
    }

    try {
      const updated = db.addSubcategoryTag(parentId, validation.data.name);

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: 'SUBCATEGORY_TAG_ADDED',
          adminEmail: admin.email,
          parentId,
          tagName: validation.data.name,
          clientIp,
          userAgent
        }
      );

      return updated;
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to add subcategory tag.',
        err.statusCode || 400,
        err.code || 'SUBCATEGORY_TAG_FAILED'
      );
    }
  }

  /**
   * Super Admin removes a subcategory string tag from a parent category
   */
  public async removeSubcategoryTag(
    adminUserId: string,
    parentId: string,
    tagName: string,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<Category> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can manage subcategories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    try {
      const updated = db.removeSubcategoryTag(parentId, tagName);

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: 'SUBCATEGORY_TAG_REMOVED',
          adminEmail: admin.email,
          parentId,
          tagName,
          clientIp,
          userAgent
        }
      );

      return updated;
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to remove subcategory tag.',
        err.statusCode || 400,
        err.code || 'SUBCATEGORY_TAG_FAILED'
      );
    }
  }

  /**
   * Super Admin category creation (Section 11, 12, 14)
   * Strictly verifies caller is designated Super Admin (maddyahamco00@gmail.com).
   * CLIENT users are strictly forbidden (403).
   */
  public async createCategory(
    adminUserId: string,
    payload: unknown,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<Category> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can create categories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    try {
      const validation = validateCreateCategoryPayload(payload);
      if (!validation.success || !validation.data) {
        const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid category payload';
        throw new CategoryServiceError(msg, 400, 'VALIDATION_ERROR', validation.errors);
      }

      const created = db.createCategory(validation.data as CreateCategoryInput);

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: 'CATEGORY_CREATED',
          adminEmail: admin.email,
          categoryId: created.id,
          categoryName: created.name,
          slug: created.slug,
          clientIp,
          userAgent
        }
      );

      return created;
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to create category.',
        err.statusCode || 400,
        err.code || 'CATEGORY_CREATION_FAILED',
        err.details
      );
    }
  }

  /**
   * Super Admin category modification (Section 11, 12, 14)
   */
  public async updateCategory(
    adminUserId: string,
    categoryId: string,
    payload: unknown,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<Category> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can update categories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    try {
      const validation = validateUpdateCategoryPayload(payload);
      if (!validation.success || !validation.data) {
        const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid category update payload';
        throw new CategoryServiceError(msg, 400, 'VALIDATION_ERROR', validation.errors);
      }

      const updated = db.updateCategory(categoryId, validation.data as UpdateCategoryInput);

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: 'CATEGORY_UPDATED',
          adminEmail: admin.email,
          categoryId: updated.id,
          categoryName: updated.name,
          slug: updated.slug,
          clientIp,
          userAgent
        }
      );

      return updated;
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to update category.',
        err.statusCode || 400,
        err.code || 'CATEGORY_UPDATE_FAILED',
        err.details
      );
    }
  }

  /**
   * Super Admin: Toggle or set category status (active/inactive) (Task 3.1.3 Section 5)
   */
  public async setCategoryStatus(
    adminUserId: string,
    categoryId: string,
    statusOrPayload: unknown,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<Category> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can change category status.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    const payload = typeof statusOrPayload === 'string' ? { status: statusOrPayload } : statusOrPayload;
    const validation = validateUpdateCategoryStatusPayload(payload);
    if (!validation.success || !validation.data) {
      const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid status payload';
      throw new CategoryServiceError(msg, 400, 'VALIDATION_ERROR', validation.errors);
    }

    try {
      const updated = db.updateCategory(categoryId, { status: validation.data.status, active: validation.data.active });

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: validation.data.status === 'active' ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
          adminEmail: admin.email,
          categoryId: updated.id,
          categoryName: updated.name,
          status: validation.data.status,
          clientIp,
          userAgent
        }
      );

      return updated;
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to update category status.',
        err.statusCode || 400,
        err.code || 'CATEGORY_STATUS_UPDATE_FAILED',
        err.details
      );
    }
  }

  /**
   * Super Admin: Update a child subcategory (Task 3.1.3 Section 6)
   */
  public async updateSubcategory(
    adminUserId: string,
    parentId: string,
    subcategoryId: string,
    payload: unknown,
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<Category> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can update subcategories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    const parent = db.getCategoryById(parentId);
    if (!parent) {
      throw new CategoryServiceError(`Parent category "${parentId}" not found.`, 404, 'CATEGORY_NOT_FOUND');
    }

    const subcategory = db.getCategoryById(subcategoryId);
    if (!subcategory) {
      throw new CategoryServiceError(`Subcategory "${subcategoryId}" not found.`, 404, 'SUBCATEGORY_NOT_FOUND');
    }

    if (subcategory.parentId && subcategory.parentId !== parent.id && subcategory.parentId !== parent.slug) {
      throw new CategoryServiceError(`Subcategory "${subcategory.name}" does not belong to parent "${parent.name}".`, 400, 'INVALID_PARENT_REFERENCE');
    }

    const validation = validateUpdateCategoryPayload(payload);
    if (!validation.success || !validation.data) {
      const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid subcategory update payload';
      throw new CategoryServiceError(msg, 400, 'VALIDATION_ERROR', validation.errors);
    }

    try {
      const updated = db.updateCategory(subcategoryId, validation.data as UpdateCategoryInput);

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: 'SUBCATEGORY_UPDATED',
          adminEmail: admin.email,
          parentId: parent.id,
          subcategoryId: updated.id,
          subcategoryName: updated.name,
          clientIp,
          userAgent
        }
      );

      return updated;
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to update subcategory.',
        err.statusCode || 400,
        err.code || 'SUBCATEGORY_UPDATE_FAILED',
        err.details
      );
    }
  }

  /**
   * Super Admin: Delete a subcategory safely
   */
  public async deleteSubcategory(
    adminUserId: string,
    parentId: string,
    subcategoryId: string,
    options?: { force?: boolean },
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<{ success: boolean; message: string }> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can delete subcategories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    const parent = db.getCategoryById(parentId);
    if (!parent) {
      throw new CategoryServiceError(`Parent category "${parentId}" not found.`, 404, 'CATEGORY_NOT_FOUND');
    }

    const subcategory = db.getCategoryById(subcategoryId);
    if (!subcategory) {
      throw new CategoryServiceError(`Subcategory "${subcategoryId}" not found.`, 404, 'SUBCATEGORY_NOT_FOUND');
    }

    if (subcategory.parentId && subcategory.parentId !== parent.id && subcategory.parentId !== parent.slug) {
      throw new CategoryServiceError(`Subcategory "${subcategory.name}" does not belong to parent "${parent.name}".`, 400, 'INVALID_PARENT_REFERENCE');
    }

    const res = await this.deleteCategory(adminUserId, subcategoryId, options, clientIp, userAgent);

    auditService.log(
      'ADMIN_ACTION',
      'CATEGORY',
      admin.id,
      'super_admin',
      {
        action: 'SUBCATEGORY_DELETED',
        adminEmail: admin.email,
        parentId: parent.id,
        subcategoryId,
        clientIp,
        userAgent
      }
    );

    return res;
  }

  /**
   * Admin category details query
   */
  public getAdminCategoryDetails(categoryId: string) {
    const category = db.getCategoryById(categoryId);
    if (!category) {
      throw new CategoryServiceError(`Category "${categoryId}" not found.`, 404, 'CATEGORY_NOT_FOUND');
    }

    const subcategories = db.getSubcategories(category.id, { status: 'all' });
    const parent = category.parentId ? db.getCategoryById(category.parentId) : null;

    let businessCount = 0;
    for (const biz of db.businesses.values()) {
      const bizCatIds = biz.categories || (biz.category ? [biz.category] : []);
      if (bizCatIds.includes(category.id as any) || bizCatIds.includes(category.slug as any)) {
        businessCount++;
      }
    }

    return {
      category,
      parent,
      subcategories,
      subcategoriesCount: subcategories.length + (category.subcategories?.length || 0),
      businessCount
    };
  }

  /**
   * Super Admin category deletion (Section 7, 11, 14)
   * Prevents accidental CASCADE loss of business data. Safe behavior ensures integrity.
   */
  public async deleteCategory(
    adminUserId: string,
    categoryId: string,
    options?: { force?: boolean },
    clientIp: string = '127.0.0.1',
    userAgent: string = 'server'
  ): Promise<{ success: boolean; message: string }> {
    const admin = db.getUserById(adminUserId);
    if (!admin || !isDesignatedSuperAdminEmail(admin.email)) {
      throw new CategoryServiceError(
        'Unauthorized: Only the designated Super Admin can delete categories.',
        403,
        'FORBIDDEN_SUPER_ADMIN_REQUIRED'
      );
    }

    try {
      db.deleteCategory(categoryId, options);

      auditService.log(
        'ADMIN_ACTION',
        'CATEGORY',
        admin.id,
        'super_admin',
        {
          action: 'CATEGORY_DELETED',
          adminEmail: admin.email,
          categoryId,
          forced: !!options?.force,
          clientIp,
          userAgent
        }
      );

      return { success: true, message: 'Category removed successfully.' };
    } catch (err: any) {
      if (err instanceof CategoryServiceError) throw err;
      throw new CategoryServiceError(
        err.message || 'Failed to delete category.',
        err.statusCode || 400,
        err.code || 'CATEGORY_DELETION_FAILED'
      );
    }
  }

  /**
   * Idempotent category seeding (Section 8 & 9)
   */
  public seedCategories(customSeeds?: Partial<Category>[]): { created: number; existing: number; total: number } {
    return db.seedCategories(customSeeds);
  }
}

export const categoryService = new CategoryService();
