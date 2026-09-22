import { z } from 'zod';
import { sanitizeString } from './authValidators';
import { validatePhoneNumber } from '../../lib/phoneUtils';
import { Business } from '../../types';

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
  categoryId: z
    .string({ message: 'Category ID must be a string' })
    .trim()
    .min(1, 'Category ID cannot be empty')
    .max(100, 'Category ID must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Category ID cannot contain control characters or null bytes'
    })
    .optional()
    .nullable(),
  category: z
    .string({ message: 'Category must be a string' })
    .trim()
    .min(1, 'Category cannot be empty')
    .max(100, 'Category must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Category cannot contain control characters or null bytes'
    })
    .optional()
    .nullable(),
  subcategoryId: z
    .string({ message: 'Subcategory ID must be a string' })
    .trim()
    .max(100, 'Subcategory ID must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Subcategory ID cannot contain control characters or null bytes'
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  subcategory: z
    .string({ message: 'Subcategory must be a string' })
    .trim()
    .max(100, 'Subcategory must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Subcategory cannot contain control characters or null bytes'
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  subcategories: z
    .array(
      z.string({ message: 'Subcategory item must be a string' })
        .trim()
        .min(1, 'Subcategory item cannot be empty')
        .max(100, 'Subcategory item must not exceed 100 characters')
    )
    .max(10)
    .optional(),
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
 * Epic 3 Feature 3.1 Task 3.1.4: Select Business Category & Subcategory Schema
 * 
 * Validates selection of primary Category and optional Subcategory for a business.
 */
export const SelectBusinessCategorySchema = z.object({
  categoryId: z
    .string({ message: 'Category ID is required' })
    .trim()
    .min(1, 'Category ID is required')
    .max(100, 'Category ID must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Category ID cannot contain control characters or null bytes'
    }),
  subcategoryId: z
    .string({ message: 'Subcategory ID must be a string' })
    .trim()
    .max(100, 'Subcategory ID must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Subcategory ID cannot contain control characters or null bytes'
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  subcategory: z
    .string({ message: 'Subcategory must be a string' })
    .trim()
    .max(100, 'Subcategory must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Subcategory cannot contain control characters or null bytes'
    })
    .optional()
    .nullable()
    .or(z.literal(''))
}).strict();

export type SelectBusinessCategoryInput = z.infer<typeof SelectBusinessCategorySchema>;

/**
 * Epic 2 Feature 2.2 Task 2.2.5 & Epic 3 Feature 3.1 Task 3.1.4: Update Business Categories Schema
 * 
 * Supports both:
 * 1. Single category + subcategory selection ({ categoryId, subcategoryId })
 * 2. Multi-category selection ({ categoryIds: [...] })
 * - Rejects null bytes and control characters
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
    .optional(),
  categoryId: z
    .string({ message: 'Category ID must be a string' })
    .trim()
    .min(1, 'Category ID cannot be empty')
    .max(100, 'Category ID must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Category ID cannot contain control characters or null bytes'
    })
    .optional()
    .nullable(),
  category: z
    .string({ message: 'Category must be a string' })
    .trim()
    .min(1, 'Category cannot be empty')
    .max(100, 'Category must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Category cannot contain control characters or null bytes'
    })
    .optional()
    .nullable(),
  subcategoryId: z
    .string({ message: 'Subcategory ID must be a string' })
    .trim()
    .max(100, 'Subcategory ID must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Subcategory ID cannot contain control characters or null bytes'
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  subcategory: z
    .string({ message: 'Subcategory must be a string' })
    .trim()
    .max(100, 'Subcategory must not exceed 100 characters')
    .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
      message: 'Subcategory cannot contain control characters or null bytes'
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  subcategories: z
    .array(
      z.string({ message: 'Subcategory item must be a string' })
        .trim()
        .min(1, 'Subcategory item cannot be empty')
        .max(100, 'Subcategory item must not exceed 100 characters')
    )
    .max(10)
    .optional()
}).strict().refine((data) => {
  return data.categoryIds !== undefined || data.categoryId !== undefined || data.category !== undefined;
}, {
  message: 'Either categoryId or categoryIds must be provided.'
});

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

/**
 * Epic 2 Feature 2.2 Task 2.2.7: Business Opening Hours Validation
 */
export const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const VALID_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

export type ValidWeekday = (typeof VALID_WEEKDAYS)[number];

export const TimePeriodSchema = z.object({
  open: z.string({ message: 'Opening time is required' })
    .regex(TIME_REGEX, 'Invalid opening time. Expected 24-hour format HH:mm (e.g., 09:00)'),
  close: z.string({ message: 'Closing time is required' })
    .regex(TIME_REGEX, 'Invalid closing time. Expected 24-hour format HH:mm (e.g., 17:00)'),
  crossMidnight: z.boolean().optional()
}).strict().refine((data) => {
  // Reject identical open and close times (0 duration interval)
  if (data.open === data.close) {
    return false;
  }
  // Unless cross-midnight is explicitly enabled, opening time must precede closing time
  if (!data.crossMidnight) {
    return data.open < data.close;
  }
  return true;
}, {
  message: 'Invalid interval: closing time must be after opening time (or enable cross-midnight for overnight hours)'
});

export type TimePeriodInput = z.infer<typeof TimePeriodSchema>;

export const DayOpeningHoursSchema = z.object({
  day: z.enum(VALID_WEEKDAYS),
  isOpen: z.boolean({ message: 'isOpen flag is required' }),
  periods: z.array(TimePeriodSchema).max(3, 'At most 3 opening periods permitted per day').optional()
}).strict().superRefine((data, ctx) => {
  if (data.isOpen) {
    if (!data.periods || data.periods.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Open day '${data.day}' must have at least one opening period`,
        path: ['periods']
      });
      return;
    }

    // Check for overlapping periods on the same day
    const intervals: { start: number; end: number }[] = [];
    for (const p of data.periods) {
      const [oh, om] = p.open.split(':').map(Number);
      const [ch, cm] = p.close.split(':').map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;

      if (p.crossMidnight && closeMin < openMin) {
        intervals.push({ start: openMin, end: 1440 });
        intervals.push({ start: 0, end: closeMin });
      } else {
        intervals.push({ start: openMin, end: closeMin });
      }
    }

    // Check pairwise overlap
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const a = intervals[i];
        const b = intervals[j];
        if (a.start < b.end && b.start < a.end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Overlapping opening periods are not permitted on ${data.day}`,
            path: ['periods']
          });
          return;
        }
      }
    }
  }
});

export type DayOpeningHoursInput = z.infer<typeof DayOpeningHoursSchema>;

export const OpeningHoursArraySchema = z.array(DayOpeningHoursSchema)
  .min(1, 'Opening hours must contain at least one day')
  .max(7, 'Opening hours cannot exceed 7 days')
  .refine((days) => {
    const dayNames = days.map(d => d.day);
    return new Set(dayNames).size === dayNames.length;
  }, {
    message: 'Duplicate day entries are not permitted in the opening hours schedule'
  });

export const UpdateOpeningHoursSchema = z.object({
  openingHours: OpeningHoursArraySchema
}).strict();

export type UpdateOpeningHoursInput = z.infer<typeof UpdateOpeningHoursSchema>;

/**
 * Epic 2 Feature 2.2 Task 2.2.8: Business Contact Information Validation & Normalization
 * 
 * Rules:
 * - phone: Optional string, validated & normalized via E.164 utility (Nigerian & international formats)
 * - email: Optional string, validated email address (distinct from user login email)
 * - website: Optional string, HTTP/HTTPS only, rejects unsafe protocols (javascript, data, file)
 * - Empty string or null clears the respective field
 * - strict() ensures rejection of unapproved / mass-assignment fields
 */

export function validateAndNormalizeBusinessPhone(rawPhone?: string | null): string | null | undefined {
  if (rawPhone === undefined) return undefined;
  if (rawPhone === null || rawPhone.trim() === '') return null;

  const result = validatePhoneNumber(rawPhone);
  if (!result.valid) {
    throw new Error(result.error || 'Invalid phone number format. Please provide a valid phone number.');
  }
  return result.normalized || null;
}

export function validateAndNormalizeBusinessEmail(rawEmail?: string | null): string | null | undefined {
  if (rawEmail === undefined) return undefined;
  if (rawEmail === null || rawEmail.trim() === '') return null;

  const trimmed = rawEmail.trim().toLowerCase();

  // Reject control characters or null bytes
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    throw new Error('Business contact email cannot contain control characters.');
  }

  if (trimmed.length > 150) {
    throw new Error('Business contact email cannot exceed 150 characters.');
  }

  // Standard email format check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Please provide a valid business contact email address.');
  }

  return trimmed;
}

export function validateAndNormalizeBusinessWebsite(rawWebsite?: string | null): string | null | undefined {
  if (rawWebsite === undefined) return undefined;
  if (rawWebsite === null || rawWebsite.trim() === '') return null;

  const trimmed = rawWebsite.trim();

  // Reject control characters, null bytes, HTML tags
  if (/[\u0000-\u001F\u007F<>]/.test(trimmed)) {
    throw new Error('Business website URL contains invalid characters or markup.');
  }

  if (trimmed.length > 500) {
    throw new Error('Business website URL cannot exceed 500 characters.');
  }

  // Reject unsafe protocol schemes (javascript:, data:, file:, vbscript:, blob:, etc.)
  if (/^(?:javascript|data|file|vbscript|blob|about|mailto|tel):/i.test(trimmed)) {
    throw new Error('Invalid website URL: unsafe protocols are not permitted.');
  }

  // Auto-prepend https:// if protocol is omitted
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (candidate.startsWith('//')) {
      candidate = `https:${candidate}`;
    } else {
      candidate = `https://${candidate}`;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Please provide a valid business website URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Website URL must use HTTP or HTTPS protocol.');
  }

  // Reject embedded credentials (e.g. https://user:pass@host)
  if (parsed.username || parsed.password) {
    throw new Error('Website URL must not contain user credentials.');
  }

  // Hostname must be present and contain a valid domain or localhost
  if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
    throw new Error('Website URL must contain a valid domain name (e.g., https://example.com).');
  }

  return parsed.toString();
}

export const UpdateBusinessContactSchema = z.object({
  phone: z
    .string({ message: 'Phone must be a string' })
    .max(50, 'Phone number cannot exceed 50 characters')
    .optional()
    .nullable(),
  email: z
    .string({ message: 'Email must be a string' })
    .max(150, 'Email cannot exceed 150 characters')
    .optional()
    .nullable(),
  website: z
    .string({ message: 'Website must be a string' })
    .max(500, 'Website URL cannot exceed 500 characters')
    .optional()
    .nullable()
}).strict();

export type UpdateBusinessContactInput = z.infer<typeof UpdateBusinessContactSchema>;

/**
 * Epic 2 Feature 2.3 Task 2.3.1: Submit Business Verification Request Schema
 * 
 * Strict validation:
 * - notes: optional string, max 500 characters, no null bytes or control characters
 * - strict(): rejects unexpected / mass-assignment / privilege escalation fields
 */
export const SubmitVerificationRequestSchema = z.object({
  notes: z
    .string({ message: 'Notes must be a string' })
    .max(500, 'Verification notes cannot exceed 500 characters')
    .refine(
      (val) => !/[\u0000-\u001F\u007F]/.test(val),
      { message: 'Verification notes contain invalid control characters or null bytes.' }
    )
    .optional()
    .nullable()
}).strict();

export type SubmitVerificationRequestInput = z.infer<typeof SubmitVerificationRequestSchema>;

/**
 * Explicit list of forbidden / privileged fields on verification request payloads.
 * Protects against mass assignment, privilege escalation, and direct status manipulation.
 */
export const FORBIDDEN_VERIFICATION_REQUEST_FIELDS = [
  'id',
  'status',
  'requesterId',
  'userId',
  'ownerId',
  'businessId',
  'isVerified',
  'verified',
  'verificationBadge',
  'verificationStatus',
  'verificationMetadata',
  'reviewerId',
  'reviewer',
  'reviewedAt',
  'approvedAt',
  'rejectedAt',
  'submittedAt',
  'rejectionReason',
  'adminDecision',
  'role',
  'permissions',
  'createdAt',
  'updatedAt'
] as const;

export function validateNoVerificationPrivilegeEscalation(body: Record<string, unknown>): void {
  if (!body || typeof body !== 'object') return;
  for (const field of FORBIDDEN_VERIFICATION_REQUEST_FIELDS) {
    if (field in body && body[field] !== undefined) {
      const err = new Error(`Privilege escalation attempt blocked: field "${field}" cannot be set by client.`);
      (err as any).code = 'PRIVILEGE_ESCALATION_FORBIDDEN';
      (err as any).statusCode = 403;
      throw err;
    }
  }
}

/**
 * Business Profile Verification Eligibility Assessment (Epic 2 Feature 2.3 Task 2.3.1)
 * 
 * Inspects existing business profile data according to current architecture:
 * - Business name (minimum 2 characters)
 * - Business description (minimum 10 characters)
 * - Category (at least one category selected)
 * - Location (city, address, or state defined)
 * - Contact information (at least one contact method: phone, email, or whatsapp)
 */
export interface BusinessVerificationEligibilityResult {
  eligible: boolean;
  missingFields: ('name' | 'description' | 'category' | 'location' | 'contact')[];
  fieldErrors: Record<string, string>;
  message: string;
}

export function validateBusinessVerificationEligibility(
  business: Partial<Business> | null | undefined
): BusinessVerificationEligibilityResult {
  if (!business) {
    return {
      eligible: false,
      missingFields: ['name', 'description', 'category', 'location', 'contact'],
      fieldErrors: { business: 'Business not found.' },
      message: 'Business not found.'
    };
  }

  const missingFields: ('name' | 'description' | 'category' | 'location' | 'contact')[] = [];
  const fieldErrors: Record<string, string> = {};

  // 1. Business Name (minimum 2 characters)
  if (!business.name || typeof business.name !== 'string' || business.name.trim().length < 2) {
    missingFields.push('name');
    fieldErrors.name = 'Business name is required and must be at least 2 characters.';
  }

  // 2. Business Description (minimum 10 characters)
  if (!business.description || typeof business.description !== 'string' || business.description.trim().length < 10) {
    missingFields.push('description');
    fieldErrors.description = 'Business description is required and must be at least 10 characters.';
  }

  // 3. Category (at least one category selected)
  const anyBiz = business as Record<string, unknown>;
  const hasCategory = Boolean(
    (business.category && typeof business.category === 'string' && business.category.trim()) ||
    (Array.isArray(business.categories) && business.categories.length > 0) ||
    (Array.isArray(anyBiz.categoryIds) && anyBiz.categoryIds.length > 0) ||
    (Array.isArray(anyBiz.businessCategories) && anyBiz.businessCategories.length > 0)
  );
  if (!hasCategory) {
    missingFields.push('category');
    fieldErrors.category = 'At least one business category must be selected.';
  }

  // 4. Location (city, address, or state configured)
  const hasLocation = Boolean(
    business.location && (
      (business.location.city && typeof business.location.city === 'string' && business.location.city.trim()) ||
      (business.location.address && typeof business.location.address === 'string' && business.location.address.trim()) ||
      (business.location.state && typeof business.location.state === 'string' && business.location.state.trim())
    )
  );
  if (!hasLocation) {
    missingFields.push('location');
    fieldErrors.location = 'Business location (city, state, or address) is required.';
  }

  // 5. Contact Information (phone, email, or whatsapp)
  const hasContact = Boolean(
    (business.phone && typeof business.phone === 'string' && business.phone.trim().length > 0) ||
    (business.email && typeof business.email === 'string' && business.email.trim().length > 0) ||
    (business.whatsapp && typeof business.whatsapp === 'string' && business.whatsapp.trim().length > 0)
  );
  if (!hasContact) {
    missingFields.push('contact');
    fieldErrors.contact = 'At least one contact method (phone, email, or WhatsApp) is required.';
  }

  const eligible = missingFields.length === 0;

  const friendlyMissing = missingFields.map(f => {
    switch (f) {
      case 'name': return 'Business Name';
      case 'description': return 'Business Description (min 10 chars)';
      case 'category': return 'Business Category';
      case 'location': return 'Location (City or Address)';
      case 'contact': return 'Contact Information (Phone, Email, or WhatsApp)';
    }
  });

  return {
    eligible,
    missingFields,
    fieldErrors,
    message: eligible
      ? 'Business profile meets all eligibility requirements for verification.'
      : `Business profile is incomplete. Please complete: ${friendlyMissing.join(', ')}.`
  };
}

/**
 * Forbidden fields on admin review requests (approve / reject).
 * Review metadata (reviewerId, reviewedAt, approvalDate, isVerified, etc.)
 * must strictly be server-controlled from the authenticated Super Admin session.
 */
export const FORBIDDEN_ADMIN_REVIEW_FIELDS = [
  'reviewerId',
  'reviewedAt',
  'approvalDate',
  'ownerId',
  'businessId',
  'isVerified',
  'verified',
  'role',
  'permissions',
  'isSuperAdmin',
  'createdAt',
  'updatedAt'
] as const;

export function validateAdminReviewPayload(
  body: Record<string, unknown>,
  action: 'APPROVE' | 'REJECT'
): { rejectionReason?: string } {
  if (body && typeof body === 'object') {
    for (const field of FORBIDDEN_ADMIN_REVIEW_FIELDS) {
      if (field in body && body[field] !== undefined) {
        const err = new Error(`Mass assignment blocked: field "${field}" cannot be set via review request.`);
        (err as any).code = 'MASS_ASSIGNMENT_FORBIDDEN';
        (err as any).statusCode = 400;
        throw err;
      }
    }
  }

  if (action === 'REJECT') {
    const reason = body?.rejectionReason;
    if (typeof reason !== 'string' || !reason.trim()) {
      const err = new Error('A valid rejection reason is required when rejecting a verification request.');
      (err as any).code = 'REJECTION_REASON_REQUIRED';
      (err as any).statusCode = 400;
      throw err;
    }
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      const err = new Error('Rejection reason must be at least 3 characters long.');
      (err as any).code = 'INVALID_REJECTION_REASON';
      (err as any).statusCode = 400;
      throw err;
    }
    if (trimmed.length > 500) {
      const err = new Error('Rejection reason must not exceed 500 characters.');
      (err as any).code = 'INVALID_REJECTION_REASON';
      (err as any).statusCode = 400;
      throw err;
    }
    return { rejectionReason: trimmed };
  }

  return {};
}

/**
 * Safely sanitizes search query string:
 * - Strips null bytes and ASCII control characters
 * - Strips script tags, HTML tags and angle brackets
 * - Trims leading and trailing whitespace
 * - Collapses consecutive whitespace into a single space
 */
export function sanitizeSearchQuery(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validation schema for public business search query params (Epic 3 Feature 3.2 Task 3.2.1)
 */
export const BusinessSearchQuerySchema = z.object({
  q: z.string({ message: 'Search query is required.' })
    .transform(val => sanitizeSearchQuery(val))
    .refine(val => val.length > 0, {
      message: 'Search query is required and cannot be empty.'
    })
    .refine(val => val.length <= 100, {
      message: 'Search query must not exceed 100 characters.'
    }),
  page: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 1;
    const num = Number(val);
    return isNaN(num) ? 1 : num;
  }, z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 12;
    const num = Number(val);
    return isNaN(num) ? 12 : Math.min(Math.max(num, 1), 50);
  }, z.number().int().min(1).max(50).default(12)),
});

export type BusinessSearchQuery = z.infer<typeof BusinessSearchQuerySchema>;



