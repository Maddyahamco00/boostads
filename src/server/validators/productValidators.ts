import { z } from 'zod';
import { sanitizeSearchQuery } from './businessValidators';

export { sanitizeSearchQuery };

/**
 * Validation schema for public product search query parameters (Epic 3 Feature 3.2 Task 3.2.2)
 */
export const ProductSearchQuerySchema = z.object({
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

export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>;

/**
 * Validation schema for product creation / update
 */
export const CreateProductSchema = z.object({
  businessId: z.string({ message: 'Business ID is required.' }).min(1),
  name: z.string({ message: 'Product name is required.' }).min(2, 'Product name must be at least 2 characters.').max(120),
  description: z.string().max(2000).optional().default(''),
  price: z.number().min(0, 'Price must be non-negative.').default(0),
  currency: z.string().length(3).default('NGN'),
  imageUrls: z.array(z.string().url()).optional().default([]),
  category: z.string().optional().default('General'),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  subcategoryName: z.string().optional(),
  inStock: z.boolean().default(true),
  sku: z.string().max(60).optional()
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
