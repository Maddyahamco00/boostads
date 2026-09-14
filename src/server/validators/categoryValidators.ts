import { z } from 'zod';

/**
 * Normalizes and slugifies a category name into a URL, search, API and SEO friendly slug.
 * Example:
 * - "Food & Restaurant" -> "food-restaurant"
 * - "Fashion & Clothing" -> "fashion-clothing"
 * - "Construction" -> "construction"
 * - "Software, IT & Digital" -> "software-it-digital"
 * - "Farming & Agricultural Services" -> "farming-agricultural-services"
 */
export function slugifyCategory(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitizes category textual fields to prevent XSS / HTML injection.
 */
export function sanitizeCategoryText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Validates category slug format:
 * - Lowercase alphanumeric characters separated by single hyphens
 * - 2 to 100 characters in length
 * - No leading or trailing hyphens
 */
export const CategorySlugSchema = z
  .string()
  .min(2, 'Category slug must be at least 2 characters.')
  .max(100, 'Category slug cannot exceed 100 characters.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Category slug must contain only lowercase letters, numbers, and single hyphens without leading or trailing hyphens.');

/**
 * Validates category name format:
 * - 2 to 100 characters in length
 * - Trimmed text
 */
export const CategoryNameSchema = z
  .string()
  .min(2, 'Category name must be at least 2 characters.')
  .max(100, 'Category name cannot exceed 100 characters.')
  .transform(val => sanitizeCategoryText(val));

export const CategoryStatusSchema = z.enum(['active', 'inactive']);

export const MAX_CATEGORY_DEPTH = 3;

/**
 * Forbidden fields for category payloads to prevent mass-assignment vulnerabilities.
 * Section 11: Do not allow requests to inject role, permissions, isSuperAdmin, ownerId, userId, security flags, etc.
 */
export const FORBIDDEN_CATEGORY_MASS_ASSIGNMENT_FIELDS = [
  'role',
  'permissions',
  'isSuperAdmin',
  'ownerId',
  'userId',
  'user',
  'createdAt',
  'updatedAt',
  'securityFlags',
  'internalMetadata',
  'password',
  'passwordHash'
];

export function validateNoCategoryMassAssignment(payload: unknown): {
  allowed: boolean;
  forbiddenField?: string;
} {
  if (!payload || typeof payload !== 'object') return { allowed: true };
  const record = payload as Record<string, unknown>;
  for (const forbidden of FORBIDDEN_CATEGORY_MASS_ASSIGNMENT_FIELDS) {
    if (forbidden in record && record[forbidden] !== undefined) {
      return { allowed: false, forbiddenField: forbidden };
    }
  }
  return { allowed: true };
}

/**
 * Schema for creating a category
 */
export const CreateCategorySchema = z.object({
  id: z.string().min(2).max(100).optional(),
  name: CategoryNameSchema,
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters.').max(100).optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters.').optional().transform(val => val ? sanitizeCategoryText(val) : ''),
  status: CategoryStatusSchema.default('active'),
  active: z.boolean().optional(),
  parentId: z.string().min(1).nullable().optional(),
  iconName: z.string().max(50).optional().default('Folder'),
  bannerImage: z.string().url().or(z.string().startsWith('http')).optional().default('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'),
  subcategories: z.array(z.string().min(1).max(100)).optional().default([])
});

/**
 * Schema for creating a child subcategory under a parent (Epic 3 Feature 3.1 Task 3.1.2)
 */
export const CreateSubcategorySchema = z.object({
  id: z.string().min(2).max(100).optional(),
  name: CategoryNameSchema,
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters.').max(100).optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters.').optional().transform(val => val ? sanitizeCategoryText(val) : ''),
  status: CategoryStatusSchema.default('active'),
  active: z.boolean().optional(),
  parentId: z.string().min(1, 'Parent category identifier is required for creating a subcategory.'),
  iconName: z.string().max(50).optional().default('Tag'),
  bannerImage: z.string().url().or(z.string().startsWith('http')).optional().default('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'),
  subcategories: z.array(z.string().min(1).max(100)).optional().default([])
});

/**
 * Schema for adding a subcategory name tag
 */
export const AddSubcategoryItemSchema = z.object({
  name: z.string().trim().min(2, 'Subcategory name must be at least 2 characters.').max(100, 'Subcategory name cannot exceed 100 characters.').transform(val => sanitizeCategoryText(val))
});

/**
 * Schema for updating category status (Task 3.1.3 Section 5)
 */
export const UpdateCategoryStatusSchema = z.object({
  status: CategoryStatusSchema.optional(),
  active: z.boolean().optional()
}).refine(data => data.status !== undefined || data.active !== undefined, {
  message: 'Either status ("active" | "inactive") or active (boolean) must be provided.'
});

/**
 * Schema for updating a category
 */
export const UpdateCategorySchema = z.object({
  name: CategoryNameSchema.optional(),
  slug: CategorySlugSchema.optional(),
  description: z.string().max(1000).optional().transform(val => val !== undefined ? sanitizeCategoryText(val) : undefined),
  status: CategoryStatusSchema.optional(),
  active: z.boolean().optional(),
  parentId: z.string().min(1).nullable().optional(),
  iconName: z.string().max(50).optional(),
  bannerImage: z.string().url().or(z.string().startsWith('http')).optional(),
  subcategories: z.array(z.string().min(1).max(100)).optional()
});

export type CreateCategoryPayload = z.infer<typeof CreateCategorySchema>;
export type CreateSubcategoryPayload = z.infer<typeof CreateSubcategorySchema>;
export type UpdateCategoryPayload = z.infer<typeof UpdateCategorySchema>;

export function validateCreateSubcategoryPayload(parentId: string, payload: unknown): {
  success: boolean;
  data?: CreateSubcategoryPayload;
  errors?: Record<string, string>;
} {
  const massCheck = validateNoCategoryMassAssignment(payload);
  if (!massCheck.allowed) {
    return {
      success: false,
      errors: {
        [massCheck.forbiddenField!]: `Mass assignment rejected: "${massCheck.forbiddenField}" is a protected internal field.`
      }
    };
  }

  const merged = typeof payload === 'object' && payload !== null
    ? { ...(payload as Record<string, unknown>), parentId: (payload as Record<string, unknown>).parentId || parentId }
    : { parentId };

  const result = CreateSubcategorySchema.safeParse(merged);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || 'general';
      errors[field] = issue.message;
    }
    return { success: false, errors };
  }

  const data = result.data;
  if (!data.slug || data.slug.trim().length === 0) {
    data.slug = slugifyCategory(data.name);
  } else {
    data.slug = slugifyCategory(data.slug);
  }

  const slugValidation = CategorySlugSchema.safeParse(data.slug);
  if (!slugValidation.success) {
    return {
      success: false,
      errors: { slug: 'Generated or provided subcategory slug is invalid. Must contain alphanumeric characters and hyphens.' }
    };
  }

  if (data.status === 'inactive') {
    data.active = false;
  } else if (data.active === false) {
    data.status = 'inactive';
  } else {
    data.active = true;
    data.status = 'active';
  }

  return { success: true, data };
}

export function validateAddSubcategoryItemPayload(payload: unknown): {
  success: boolean;
  data?: { name: string };
  errors?: Record<string, string>;
} {
  const result = AddSubcategoryItemSchema.safeParse(payload);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || 'general';
      errors[field] = issue.message;
    }
    return { success: false, errors };
  }
  return { success: true, data: result.data as { name: string } };
}

export function validateCreateCategoryPayload(payload: unknown): {
  success: boolean;
  data?: CreateCategoryPayload;
  errors?: Record<string, string>;
} {
  const massCheck = validateNoCategoryMassAssignment(payload);
  if (!massCheck.allowed) {
    return {
      success: false,
      errors: {
        [massCheck.forbiddenField!]: `Mass assignment rejected: "${massCheck.forbiddenField}" is a protected internal field.`
      }
    };
  }

  const result = CreateCategorySchema.safeParse(payload);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || 'general';
      errors[field] = issue.message;
    }
    return { success: false, errors };
  }

  const data = result.data;
  // If slug was not explicitly provided, generate it deterministically from name
  if (!data.slug || data.slug.trim().length === 0) {
    data.slug = slugifyCategory(data.name);
  } else {
    data.slug = slugifyCategory(data.slug);
  }

  // Validate the final derived slug with CategorySlugSchema
  const slugValidation = CategorySlugSchema.safeParse(data.slug);
  if (!slugValidation.success) {
    return {
      success: false,
      errors: { slug: 'Generated or provided slug is invalid. Must contain alphanumeric characters and hyphens.' }
    };
  }

  // Ensure active matches status
  if (data.status === 'inactive') {
    data.active = false;
  } else if (data.active === false) {
    data.status = 'inactive';
  } else {
    data.active = true;
    data.status = 'active';
  }

  return { success: true, data };
}

export function validateUpdateCategoryPayload(payload: unknown): {
  success: boolean;
  data?: UpdateCategoryPayload;
  errors?: Record<string, string>;
} {
  const massCheck = validateNoCategoryMassAssignment(payload);
  if (!massCheck.allowed) {
    return {
      success: false,
      errors: {
        [massCheck.forbiddenField!]: `Mass assignment rejected: "${massCheck.forbiddenField}" is a protected internal field.`
      }
    };
  }

  const result = UpdateCategorySchema.safeParse(payload);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || 'general';
      errors[field] = issue.message;
    }
    return { success: false, errors };
  }

  const data = result.data;
  if (data.slug !== undefined) {
    data.slug = slugifyCategory(data.slug);
    const slugValidation = CategorySlugSchema.safeParse(data.slug);
    if (!slugValidation.success) {
      return {
        success: false,
        errors: { slug: 'Updated slug is invalid. Must contain alphanumeric characters and hyphens.' }
      };
    }
  }

  if (data.status !== undefined) {
    data.active = data.status === 'active';
  } else if (data.active !== undefined) {
    data.status = data.active ? 'active' : 'inactive';
  }

  return { success: true, data };
}

export function validateUpdateCategoryStatusPayload(payload: unknown): {
  success: boolean;
  data?: { status: 'active' | 'inactive'; active: boolean };
  errors?: Record<string, string>;
} {
  const massCheck = validateNoCategoryMassAssignment(payload);
  if (!massCheck.allowed) {
    return {
      success: false,
      errors: {
        [massCheck.forbiddenField!]: `Mass assignment rejected: "${massCheck.forbiddenField}" is a protected internal field.`
      }
    };
  }

  const result = UpdateCategoryStatusSchema.safeParse(payload);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || 'status';
      errors[field] = issue.message;
    }
    return { success: false, errors };
  }

  let status: 'active' | 'inactive' = 'active';
  if (result.data.status !== undefined) {
    status = result.data.status;
  } else if (result.data.active !== undefined) {
    status = result.data.active ? 'active' : 'inactive';
  }

  return {
    success: true,
    data: {
      status,
      active: status === 'active'
    }
  };
}
