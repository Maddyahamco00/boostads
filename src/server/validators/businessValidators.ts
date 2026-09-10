import { z } from 'zod';
import { sanitizeString } from './authValidators';

/**
 * Safely sanitizes business description text:
 * - Normalizes line breaks (CRLF/CR -> LF)
 * - Removes null bytes and forbidden control characters
 * - Strips HTML tags and angle brackets to prevent XSS / markup injection
 * - Preserves safe line breaks and tabs
 * - Collapses excessive empty lines (maximum 2 consecutive newlines)
 * - Trims leading and trailing whitespace
 */
export function sanitizeDescription(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Standard list of 36 Nigerian States plus Federal Capital Territory (FCT).
 */
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
] as const;

/**
 * Epic 2 Feature 2.2 Task 2.2.6: Update Business Location Schema
 * 
 * Requirements:
 * - address: optional street/physical address, trimmed, max 200 chars, no control chars or null bytes
 * - city: required city/town, trimmed, min 1, max 100 chars, no control chars or null bytes
 * - state: required state/region, trimmed, min 1, max 100 chars, no control chars or null bytes
 * - country: required country, trimmed, min 1, max 100 chars, default 'Nigeria', no control chars or null bytes
 * - lga: optional Local Government Area (Nigeria / regional district), trimmed, max 100 chars, no control chars or null bytes
 * - postalCode: optional postal/zip code, trimmed, max 20 chars, no control chars or null bytes
 * - lat: optional latitude, -90 to +90, finite number
 * - lng: optional longitude, -180 to +180, finite number
 * - isServiceAreaOnly: optional boolean (service-area / remote / online business)
 * - serviceAreaKm: optional service area radius in km (0 to 1000)
 * - strict(): rejects unexpected / mass-assignment fields
 */
export const UpdateBusinessLocationSchema = z.object({
  address: z
    .string({ message: 'Address must be a string' })
    .trim()
    .max(200, 'Address must not exceed 200 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Address cannot contain control characters or null bytes'
    })
    .optional()
    .or(z.literal('')),
  city: z
    .string({ message: 'City/town is required' })
    .trim()
    .min(1, 'City/town is required')
    .max(100, 'City must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'City cannot contain control characters or null bytes'
    }),
  state: z
    .string({ message: 'State or region is required' })
    .trim()
    .min(1, 'State or region is required')
    .max(100, 'State or region must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'State or region cannot contain control characters or null bytes'
    }),
  country: z
    .string({ message: 'Country is required' })
    .trim()
    .min(1, 'Country is required')
    .max(100, 'Country must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Country cannot contain control characters or null bytes'
    })
    .default('Nigeria'),
  lga: z
    .string({ message: 'Local Government Area must be a string' })
    .trim()
    .max(100, 'LGA must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'LGA cannot contain control characters or null bytes'
    })
    .optional()
    .or(z.literal('')),
  postalCode: z
    .string({ message: 'Postal code must be a string' })
    .trim()
    .max(20, 'Postal code must not exceed 20 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Postal code cannot contain control characters or null bytes'
    })
    .optional()
    .or(z.literal('')),
  lat: z
    .number({ message: 'Latitude must be a valid number' })
    .refine((val) => !isNaN(val) && isFinite(val), { message: 'Latitude must be a finite number' })
    .min(-90, 'Latitude must be between -90 and +90')
    .max(90, 'Latitude must be between -90 and +90')
    .optional()
    .nullable(),
  lng: z
    .number({ message: 'Longitude must be a valid number' })
    .refine((val) => !isNaN(val) && isFinite(val), { message: 'Longitude must be a finite number' })
    .min(-180, 'Longitude must be between -180 and +180')
    .max(180, 'Longitude must be between -180 and +180')
    .optional()
    .nullable(),
  isServiceAreaOnly: z
    .boolean({ message: 'isServiceAreaOnly must be a boolean' })
    .optional(),
  serviceAreaKm: z
    .number({ message: 'Service area radius must be a number' })
    .min(0, 'Service area radius cannot be negative')
    .max(1000, 'Service area radius cannot exceed 1000 km')
    .optional()
    .nullable()
}).strict();

export type UpdateBusinessLocationInput = z.infer<typeof UpdateBusinessLocationSchema>;

/**
 * Epic 2 Feature 2.2 Task 2.2.1: Create Business DTO & Validation Schema
 * 
 * Requirements:
 * - Business name required and trimmed
 * - Minimum 2 characters, maximum 100 characters
 * - Optional business description during creation (Task 2.2.4)
 * - Optional category selection during creation (Task 2.2.5)
 * - Optional location during creation (Task 2.2.6)
 * - Rejects empty/whitespace-only input
 * - Rejects control characters and null bytes
 * - Whitelists ONLY writable fields
 * - Rejects protected / system / security fields (mass-assignment protection)
 */
export const CreateBusinessSchema = z.object({
  name: z
    .string({ message: 'Business name is required' })
    .trim()
    .min(1, 'Business name is required')
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Business name cannot contain control characters or null bytes'
    })
    .refine((val) => /[a-zA-Z0-9]/.test(val), {
      message: 'Business name must contain at least one letter or number'
    })
    .transform((val) => sanitizeString(val)),
  description: z
    .string()
    .max(2000, 'Business description must not exceed 2000 characters')
    .refine((val) => !/\0/.test(val), {
      message: 'Business description cannot contain null bytes'
    })
    .optional()
    .transform((val) => (val !== undefined ? sanitizeDescription(val) : undefined)),
  categoryIds: z
    .array(
      z.string({ message: 'Category ID must be a string' })
        .trim()
        .min(1, 'Category ID cannot be empty')
        .max(50, 'Category ID must not exceed 50 characters')
        .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
          message: 'Category ID cannot contain control characters or null bytes'
        })
    )
    .max(5, 'A business may select at most 5 categories')
    .refine((items) => new Set(items).size === items.length, {
      message: 'Duplicate category selections are not permitted'
    })
    .optional(),
  location: UpdateBusinessLocationSchema.optional()
}).strict();

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;

/**
 * Epic 2 Feature 2.2 Task 2.2.4: Update Business Description Schema
 * 
 * Requirements:
 * - Maximum 2000 characters
 * - Rejects null bytes
 * - Preserves line breaks safely while neutralizing markup/XSS
 * - Allows empty string or null to reset/clear description
 * - Rejects unallowed fields strictly
 */
export const UpdateBusinessDescriptionSchema = z.object({
  description: z
    .string({ message: 'Business description must be a string' })
    .max(2000, 'Business description must not exceed 2000 characters')
    .refine((val) => !/\0/.test(val), {
      message: 'Business description cannot contain null bytes'
    })
    .transform((val) => sanitizeDescription(val))
    .or(
      z.null().transform(() => '')
    )
}).strict();

export type UpdateBusinessDescriptionInput = z.infer<typeof UpdateBusinessDescriptionSchema>;

/**
 * Epic 2 Feature 2.2 Task 2.2.5: Update Business Categories Schema
 * 
 * Requirements:
 * - Controlled category identifiers
 * - Maximum 5 categories per business
 * - No duplicate categories
 * - Rejects null bytes and control characters
 * - Rejects non-string items
 * - Strict schema to prevent mass-assignment
 */
export const UpdateBusinessCategoriesSchema = z.object({
  categoryIds: z
    .array(
      z.string({ message: 'Category ID must be a string' })
        .trim()
        .min(1, 'Category ID cannot be empty')
        .max(50, 'Category ID must not exceed 50 characters')
        .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
          message: 'Category ID cannot contain control characters or null bytes'
        })
    )
    .max(5, 'A business may select at most 5 categories')
    .refine((items) => new Set(items).size === items.length, {
      message: 'Duplicate category selections are not permitted'
    })
}).strict();

export type UpdateBusinessCategoriesInput = z.infer<typeof UpdateBusinessCategoriesSchema>;

/**
 * List of explicitly forbidden protected fields that must trigger
 * a privilege escalation / mass assignment rejection (403 Forbidden).
 */
export const PROTECTED_BUSINESS_FIELDS = [
  'ownerId',
  'userId',
  'id',
  'role',
  'permissions',
  'isVerified',
  'verified',
  'verificationBadge',
  'verificationStatus',
  'verificationMetadata',
  'rating',
  'reviewCount',
  'totalReach',
  'reach',
  'stats',
  'tier',
  'featured',
  'status',
  'accountStatus',
  'createdAt',
  'updatedAt',
  'isAdmin',
  'isSuperAdmin',
  'securityFlags'
];

/**
 * Generates a clean URL slug from a business name.
 */
export function generateBusinessSlug(name: string): string {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'biz';
}
