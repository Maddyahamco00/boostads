import { z } from 'zod';
import { sanitizeSearchQuery } from './businessValidators';

export { sanitizeSearchQuery };

/**
 * Validation schema for public advertisement search query parameters (Epic 3 Feature 3.2 Task 3.2.4)
 */
export const AdvertisementSearchQuerySchema = z.object({
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
    return isNaN(num) ? 1 : Math.max(1, Math.floor(num));
  }, z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 12;
    const num = Number(val);
    return isNaN(num) ? 12 : Math.min(Math.max(Math.floor(num), 1), 50);
  }, z.number().int().min(1).max(50).default(12)),
});

export type AdvertisementSearchQuery = z.infer<typeof AdvertisementSearchQuerySchema>;
