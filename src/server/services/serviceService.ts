import { db } from '../db';
import { 
  Service, 
  Business, 
  Category, 
  PublicServiceProfile, 
  PublicServiceBusinessInfo, 
  ServiceSearchResponse 
} from '../../types';
import { 
  ServiceSearchQuerySchema, 
  CreateServiceSchema, 
  CreateServiceInput 
} from '../validators/serviceValidators';

export class ServiceServiceError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, code = 'SERVICE_SERVICE_ERROR', details?: unknown) {
    super(message);
    this.name = 'ServiceServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Project strictly approved public fields for public service profile.
 * Explicitly excludes ownerId, private credentials, storage keys, internal metrics, and masks business address when service-area only.
 */
export function toPublicServiceProfile(
  service: Service, 
  business?: Business, 
  categoryMap?: Map<string, Category>
): PublicServiceProfile {
  // Resolve category / subcategory names relationally if maps/ids exist
  let categoryName = service.category;
  let subcategoryName = service.subcategoryName;

  if (categoryMap) {
    if (service.categoryId) {
      const cat = categoryMap.get(service.categoryId.toLowerCase());
      if (cat) categoryName = cat.name;
    }
    if (service.subcategoryId) {
      const sub = categoryMap.get(service.subcategoryId.toLowerCase());
      if (sub) subcategoryName = sub.name;
    }
  }

  // Construct sanitized public business representation
  let publicBusiness: PublicServiceBusinessInfo | undefined = undefined;
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
    id: service.id,
    businessId: service.businessId,
    name: service.name,
    description: service.description || '',
    startingPrice: typeof service.startingPrice === 'number' ? service.startingPrice : 0,
    currency: service.currency || 'NGN',
    durationUnit: service.durationUnit || 'per project',
    imageUrls: Array.isArray(service.imageUrls) ? service.imageUrls : [],
    category: categoryName || 'Services',
    categoryId: service.categoryId || undefined,
    categoryName: categoryName || undefined,
    subcategoryId: service.subcategoryId || undefined,
    subcategoryName: subcategoryName || undefined,
    deliveryMode: service.deliveryMode || 'remote',
    createdAt: service.createdAt,
    updatedAt: service.updatedAt || undefined,
    business: publicBusiness
  };
}

export class ServiceService {
  /**
   * Search publicly discoverable services with relevance scoring and pagination
   * (Epic 3 Feature 3.2 Task 3.2.3)
   */
  public async searchServices(queryParams: {
    q?: unknown;
    query?: unknown;
    search?: unknown;
    page?: unknown;
    limit?: unknown;
  }): Promise<ServiceSearchResponse> {
    const rawQuery = queryParams.q ?? queryParams.query ?? queryParams.search;

    const parsed = ServiceSearchQuerySchema.safeParse({
      q: rawQuery,
      page: queryParams.page,
      limit: queryParams.limit
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid search query.';
      const isTooLong = parsed.error.issues.some(i => i.message.includes('100'));
      const isRequiredOrEmpty = parsed.error.issues.some(i => i.message.includes('required') || i.message.includes('empty'));
      const code = isTooLong ? 'SEARCH_QUERY_TOO_LONG' : (isRequiredOrEmpty ? 'EMPTY_SEARCH_QUERY' : 'INVALID_SEARCH_QUERY');
      throw new ServiceServiceError(errorMsg, 400, code);
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
          continue; // Owner not in good standing: hide business and its services
        }
      }
      validBusinesses.set(business.id, business);
    }

    interface ScoredService {
      service: Service;
      business: Business;
      score: number;
    }

    const matched: ScoredService[] = [];

    // Query services
    for (const service of db.services.values()) {
      // 1. Visibility Check: Owning business must exist and be public/active
      const business = validBusinesses.get(service.businessId);
      if (!business) {
        continue;
      }

      // 2. Relational Category Names (from service category/IDs or inherited from business)
      const categoryNames: string[] = [];
      const subcategoryNames: string[] = [];

      // Direct Service Category
      if (service.categoryId) {
        const cat = categoryMap.get(service.categoryId.toLowerCase());
        if (cat) categoryNames.push(cat.name);
      }
      if (service.category) {
        const cat = categoryMap.get(service.category.toLowerCase());
        if (cat) categoryNames.push(cat.name);
        else categoryNames.push(service.category);
      }

      // Direct Service Subcategory
      if (service.subcategoryId) {
        const sub = categoryMap.get(service.subcategoryId.toLowerCase());
        if (sub) subcategoryNames.push(sub.name);
      }
      if (service.subcategoryName) {
        if (!subcategoryNames.includes(service.subcategoryName)) {
          subcategoryNames.push(service.subcategoryName);
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
      const serviceName = (service.name || '').toLowerCase();
      const serviceDesc = (service.description || '').toLowerCase();
      const deliveryMode = (service.deliveryMode || '').toLowerCase();
      const bizName = (business.name || '').toLowerCase();
      const catText = categoryNames.join(' ').toLowerCase();
      const subcatText = subcategoryNames.join(' ').toLowerCase();

      // Check matches
      const exactNameMatch = serviceName === normalizedQuery;
      const prefixNameMatch = serviceName.startsWith(normalizedQuery);
      const partialNameMatch = serviceName.includes(normalizedQuery);
      const partialDescMatch = serviceDesc.includes(normalizedQuery);
      const partialCatMatch = catText.includes(normalizedQuery);
      const partialSubcatMatch = subcatText.includes(normalizedQuery);
      const partialBizMatch = bizName.includes(normalizedQuery);
      const deliveryMatch = deliveryMode.includes(normalizedQuery);

      let isMatch = exactNameMatch || prefixNameMatch || partialNameMatch || partialDescMatch || partialCatMatch || partialSubcatMatch || partialBizMatch || deliveryMatch;

      // Multi-word token matching (all words match across combined service & business fields)
      if (!isMatch && queryTokens.length > 1) {
        const combinedText = `${serviceName} ${serviceDesc} ${deliveryMode} ${bizName} ${catText} ${subcatText}`;
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
      if (deliveryMatch) score += 10;

      // Quality & verification boosts
      if (business.isVerified) score += 10;

      matched.push({ service, business, score });
    }

    // Sort by relevance score descending, then createdAt, then name
    matched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.service.name.localeCompare(b.service.name);
    });

    const total = matched.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedSlice = matched.slice(startIndex, startIndex + limit);

    const publicServices = paginatedSlice.map(item => 
      toPublicServiceProfile(item.service, item.business, categoryMap)
    );

    return {
      success: true,
      services: publicServices,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Get single public service by ID
   */
  public async getPublicServiceById(id: string): Promise<PublicServiceProfile | null> {
    const service = db.getServiceById(id);
    if (!service) return null;

    const business = db.getBusinessById(service.businessId);
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

    return toPublicServiceProfile(service, business, categoryMap);
  }

  /**
   * Create a new service for an owned business
   */
  public async createService(userId: string, input: CreateServiceInput): Promise<Service> {
    const parsed = CreateServiceSchema.safeParse(input);
    if (!parsed.success) {
      throw new ServiceServiceError(parsed.error.issues[0]?.message || 'Invalid service payload', 400, 'VALIDATION_ERROR');
    }

    const business = db.getBusinessById(parsed.data.businessId);
    if (!business) {
      throw new ServiceServiceError('Business not found', 404, 'BUSINESS_NOT_FOUND');
    }

    if (business.ownerId !== userId) {
      throw new ServiceServiceError('Forbidden: You can only create services for your own business.', 403, 'FORBIDDEN');
    }

    const id = `serv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newService: Service = {
      id,
      businessId: parsed.data.businessId,
      name: parsed.data.name,
      description: parsed.data.description || '',
      startingPrice: parsed.data.startingPrice,
      currency: parsed.data.currency,
      durationUnit: parsed.data.durationUnit,
      imageUrls: parsed.data.imageUrls,
      category: parsed.data.category || business.categoryLabel || business.category || 'Services',
      categoryId: parsed.data.categoryId || business.categoryId,
      subcategoryId: parsed.data.subcategoryId || business.subcategoryId,
      subcategoryName: parsed.data.subcategoryName || business.subcategoryName,
      deliveryMode: parsed.data.deliveryMode,
      createdAt: new Date().toISOString()
    };

    return db.createService(newService);
  }
}

export const serviceService = new ServiceService();
