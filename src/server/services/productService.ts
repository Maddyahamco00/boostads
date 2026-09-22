import { db } from '../db';
import { 
  Product, 
  Business, 
  Category, 
  PublicProductProfile, 
  PublicProductBusinessInfo, 
  ProductSearchResponse 
} from '../../types';
import { 
  ProductSearchQuerySchema, 
  CreateProductSchema, 
  CreateProductInput 
} from '../validators/productValidators';

export class ProductServiceError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, code = 'PRODUCT_SERVICE_ERROR', details?: unknown) {
    super(message);
    this.name = 'ProductServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Project strictly approved public fields for public product profile.
 * Explicitly excludes ownerId, private credentials, storage keys, internal metrics, and masks business address.
 */
export function toPublicProductProfile(
  product: Product, 
  business?: Business, 
  categoryMap?: Map<string, Category>
): PublicProductProfile {
  // Resolve category / subcategory names relationally if maps/ids exist
  let categoryName = product.category;
  let subcategoryName = product.subcategoryName;

  if (categoryMap) {
    if (product.categoryId) {
      const cat = categoryMap.get(product.categoryId.toLowerCase());
      if (cat) categoryName = cat.name;
    }
    if (product.subcategoryId) {
      const sub = categoryMap.get(product.subcategoryId.toLowerCase());
      if (sub) subcategoryName = sub.name;
    }
  }

  // Construct sanitized public business representation
  let publicBusiness: PublicProductBusinessInfo | undefined = undefined;
  if (business) {
    publicBusiness = {
      id: business.id,
      name: business.name,
      slug: business.slug || undefined,
      logoUrl: business.logoUrl || undefined,
      category: business.category || undefined,
      categoryId: business.categoryId || undefined,
      categoryLabel: business.categoryLabel || undefined,
      subcategoryId: business.subcategoryId || undefined,
      subcategoryName: business.subcategoryName || undefined,
      location: business.location ? {
        city: business.location.city,
        state: business.location.state,
        country: business.location.country,
        lga: business.location.lga || undefined
      } : undefined,
      isVerified: Boolean(business.isVerified)
    };
  }

  return {
    id: product.id,
    businessId: product.businessId,
    name: product.name,
    description: product.description || '',
    price: typeof product.price === 'number' ? product.price : 0,
    currency: product.currency || 'NGN',
    imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
    category: categoryName || 'General',
    categoryId: product.categoryId || undefined,
    categoryName: categoryName || undefined,
    subcategoryId: product.subcategoryId || undefined,
    subcategoryName: subcategoryName || undefined,
    inStock: product.inStock !== false,
    sku: product.sku || undefined,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt || undefined,
    business: publicBusiness
  };
}

export class ProductService {
  /**
   * Search publicly discoverable products with relevance scoring and pagination
   * (Epic 3 Feature 3.2 Task 3.2.2)
   */
  public async searchProducts(queryParams: {
    q?: unknown;
    query?: unknown;
    search?: unknown;
    page?: unknown;
    limit?: unknown;
  }): Promise<ProductSearchResponse> {
    const rawQuery = queryParams.q ?? queryParams.query ?? queryParams.search;

    const parsed = ProductSearchQuerySchema.safeParse({
      q: rawQuery,
      page: queryParams.page,
      limit: queryParams.limit
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid search query.';
      const isTooLong = parsed.error.issues.some(i => i.message.includes('100'));
      const isRequiredOrEmpty = parsed.error.issues.some(i => i.message.includes('required') || i.message.includes('empty'));
      const code = isTooLong ? 'SEARCH_QUERY_TOO_LONG' : (isRequiredOrEmpty ? 'EMPTY_SEARCH_QUERY' : 'INVALID_SEARCH_QUERY');
      throw new ProductServiceError(errorMsg, 400, code);
    }

    const { q, page, limit } = parsed.data;
    const normalizedQuery = q.toLowerCase();
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    // Pre-index categories into a map to prevent N+1 query overhead
    const categoryMap = new Map<string, Category>();
    for (const cat of db.categories) {
      if (cat.id) categoryMap.set(cat.id.toLowerCase(), cat);
      if (cat.slug) categoryMap.set(cat.slug.toLowerCase(), cat);
    }

    // Pre-index valid/active businesses and owners to prevent N+1 lookups
    const validBusinesses = new Map<string, Business>();
    for (const business of db.businesses.values()) {
      if (business.ownerId) {
        const owner = db.getUserById(business.ownerId);
        if (owner && (owner.status === 'SUSPENDED' || owner.status === 'DISABLED' || owner.status === 'DELETED')) {
          continue; // Owner not in good standing: hide business and its products
        }
      }
      validBusinesses.set(business.id, business);
    }

    interface ScoredProduct {
      product: Product;
      business: Business;
      score: number;
    }

    const matched: ScoredProduct[] = [];

    // Query products
    for (const product of db.products.values()) {
      // 1. Visibility Check: Owning business must exist and be public/active
      const business = validBusinesses.get(product.businessId);
      if (!business) {
        continue;
      }

      // 2. Relational Category Names (from product category/IDs or inherited from business)
      const categoryNames: string[] = [];
      const subcategoryNames: string[] = [];

      // Direct Product Category
      if (product.categoryId) {
        const cat = categoryMap.get(product.categoryId.toLowerCase());
        if (cat) categoryNames.push(cat.name);
      }
      if (product.category) {
        const cat = categoryMap.get(product.category.toLowerCase());
        if (cat) categoryNames.push(cat.name);
        else categoryNames.push(product.category);
      }

      // Direct Product Subcategory
      if (product.subcategoryId) {
        const sub = categoryMap.get(product.subcategoryId.toLowerCase());
        if (sub) subcategoryNames.push(sub.name);
      }
      if (product.subcategoryName) {
        if (!subcategoryNames.includes(product.subcategoryName)) {
          subcategoryNames.push(product.subcategoryName);
        }
      }

      // Inherited Business Categories
      if (business.categoryId) {
        const cat = categoryMap.get(business.categoryId.toLowerCase());
        if (cat && !categoryNames.includes(cat.name)) {
          categoryNames.push(cat.name);
        }
      } else if (business.category) {
        const cat = categoryMap.get(String(business.category).toLowerCase());
        if (cat && !categoryNames.includes(cat.name)) {
          categoryNames.push(cat.name);
        }
      }

      // Inherited Business Subcategories
      if (business.subcategoryId) {
        const sub = categoryMap.get(business.subcategoryId.toLowerCase());
        if (sub && !subcategoryNames.includes(sub.name)) {
          subcategoryNames.push(sub.name);
        }
      }
      if (business.subcategoryName && !subcategoryNames.includes(business.subcategoryName)) {
        subcategoryNames.push(business.subcategoryName);
      }

      // Search fields
      const productName = (product.name || '').toLowerCase();
      const productDesc = (product.description || '').toLowerCase();
      const productSku = (product.sku || '').toLowerCase();
      const bizName = (business.name || '').toLowerCase();
      const catText = categoryNames.join(' ').toLowerCase();
      const subcatText = subcategoryNames.join(' ').toLowerCase();

      // Check matches
      const exactNameMatch = productName === normalizedQuery;
      const prefixNameMatch = productName.startsWith(normalizedQuery);
      const partialNameMatch = productName.includes(normalizedQuery);
      const partialDescMatch = productDesc.includes(normalizedQuery);
      const skuMatch = productSku.includes(normalizedQuery);
      const partialCatMatch = catText.includes(normalizedQuery);
      const partialSubcatMatch = subcatText.includes(normalizedQuery);
      const partialBizMatch = bizName.includes(normalizedQuery);

      let isMatch = exactNameMatch || prefixNameMatch || partialNameMatch || partialDescMatch || skuMatch || partialCatMatch || partialSubcatMatch || partialBizMatch;

      // Multi-word token matching (all words match across combined product & business fields)
      if (!isMatch && queryTokens.length > 1) {
        const combinedText = `${productName} ${productDesc} ${productSku} ${bizName} ${catText} ${subcatText}`;
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
      if (partialBizMatch) score += 20;
      if (partialDescMatch) score += 15;
      if (skuMatch) score += 25;

      // Quality & verification boosts
      if (business.isVerified) score += 10;
      if (product.inStock) score += 5;

      matched.push({ product, business, score });
    }

    // Sort by relevance score descending, inStock preference, then createdAt, then name
    matched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.product.inStock !== b.product.inStock) {
        return a.product.inStock ? -1 : 1;
      }
      return a.product.name.localeCompare(b.product.name);
    });

    const total = matched.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedSlice = matched.slice(startIndex, startIndex + limit);

    const publicProducts = paginatedSlice.map(item => 
      toPublicProductProfile(item.product, item.business, categoryMap)
    );

    return {
      success: true,
      products: publicProducts,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Get single public product by ID
   */
  public async getPublicProductById(id: string): Promise<PublicProductProfile | null> {
    const product = db.getProductById(id);
    if (!product) return null;

    const business = db.getBusinessById(product.businessId);
    if (!business) return null;

    if (business.ownerId) {
      const owner = db.getUserById(business.ownerId);
      if (owner && (owner.status === 'SUSPENDED' || owner.status === 'DISABLED' || owner.status === 'DELETED')) {
        return null;
      }
    }

    const categoryMap = new Map<string, Category>();
    for (const cat of db.categories) {
      if (cat.id) categoryMap.set(cat.id.toLowerCase(), cat);
      if (cat.slug) categoryMap.set(cat.slug.toLowerCase(), cat);
    }

    return toPublicProductProfile(product, business, categoryMap);
  }

  /**
   * Create a new product for an owned business
   */
  public async createProduct(userId: string, input: CreateProductInput): Promise<Product> {
    const parsed = CreateProductSchema.safeParse(input);
    if (!parsed.success) {
      throw new ProductServiceError(parsed.error.issues[0]?.message || 'Invalid product payload', 400, 'VALIDATION_ERROR');
    }

    const business = db.getBusinessById(parsed.data.businessId);
    if (!business) {
      throw new ProductServiceError('Business not found', 404, 'BUSINESS_NOT_FOUND');
    }

    if (business.ownerId !== userId) {
      throw new ProductServiceError('Forbidden: You can only create products for your own business.', 403, 'FORBIDDEN');
    }

    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProduct: Product = {
      id,
      businessId: parsed.data.businessId,
      name: parsed.data.name,
      description: parsed.data.description || '',
      price: parsed.data.price,
      currency: parsed.data.currency,
      imageUrls: parsed.data.imageUrls,
      category: parsed.data.category || business.categoryLabel || business.category || 'General',
      categoryId: parsed.data.categoryId || business.categoryId,
      subcategoryId: parsed.data.subcategoryId || business.subcategoryId,
      subcategoryName: parsed.data.subcategoryName || business.subcategoryName,
      inStock: parsed.data.inStock,
      sku: parsed.data.sku,
      createdAt: new Date().toISOString()
    };

    return db.createProduct(newProduct);
  }
}

export const productService = new ProductService();
