import { db } from '../db';
import { 
  Advertisement, 
  Business, 
  Category, 
  Product, 
  Service, 
  PublicAdvertisementProfile, 
  PublicAdvertisementBusinessInfo, 
  AdvertisementSearchResponse 
} from '../../types';
import { 
  AdvertisementSearchQuerySchema, 
  AdvertisementSearchQuery 
} from '../validators/advertisementValidators';

export class AdvertisementServiceError extends Error {
  public statusCode: number;
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, code = 'ADVERTISEMENT_SERVICE_ERROR', details?: unknown) {
    super(message);
    this.name = 'AdvertisementServiceError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Project strictly approved public fields for public advertisement profile.
 * Explicitly excludes ownerId, private credentials, internal metrics (viewsCount, clicksCount, enquiriesCount),
 * raw payment/budget configs (boostPlan.budgetNGN), and masks business address when service-area only.
 */
export function toPublicAdvertisementProfile(
  ad: Advertisement, 
  business?: Business, 
  categoryMap?: Map<string, Category>,
  productMap?: Map<string, Product>,
  serviceMap?: Map<string, Service>
): PublicAdvertisementProfile {
  // Resolve category / subcategory names relationally if maps/ids exist
  let categoryName = ad.category;
  let subcategoryName = ad.subcategoryName || ad.subcategory;

  if (categoryMap) {
    if (ad.categoryId) {
      const cat = categoryMap.get(ad.categoryId.toLowerCase());
      if (cat) categoryName = cat.name;
    }
    if (ad.subcategoryId) {
      const sub = categoryMap.get(ad.subcategoryId.toLowerCase());
      if (sub) subcategoryName = sub.name;
    }
  }

  // Resolve linked product or service if IDs exist
  let linkedProductName = ad.productName;
  if (ad.productId && productMap) {
    const prod = productMap.get(ad.productId);
    if (prod) linkedProductName = prod.name;
  }

  let linkedServiceName = ad.serviceName;
  if (ad.serviceId && serviceMap) {
    const serv = serviceMap.get(ad.serviceId);
    if (serv) linkedServiceName = serv.name;
  }

  // Construct sanitized public business representation
  let publicBusiness: PublicAdvertisementBusinessInfo | undefined = undefined;
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

  // Location privacy masking: If service-area only, strip street address and postal code
  const isServiceArea = Boolean(business?.location?.isServiceAreaOnly);
  const locationObj = ad.location || business?.location;
  const sanitizedLocation = locationObj ? {
    city: locationObj.city,
    state: locationObj.state,
    country: locationObj.country,
    lga: (locationObj as any).lga || undefined,
    address: isServiceArea ? undefined : (locationObj as any).address,
    lat: isServiceArea ? undefined : (locationObj as any).lat,
    lng: isServiceArea ? undefined : (locationObj as any).lng
  } : undefined;

  return {
    id: ad.id,
    businessId: ad.businessId,
    businessName: ad.businessName || business?.name || 'Boost Market Merchant',
    businessLogo: ad.businessLogo || business?.logoUrl || undefined,
    businessCategory: ad.businessCategory || business?.category || undefined,
    title: ad.title,
    description: ad.description || '',
    mediaUrls: Array.isArray(ad.mediaUrls) ? ad.mediaUrls : [],
    mediaType: ad.mediaType || 'image',
    category: categoryName || 'Advertisements',
    categoryId: ad.categoryId || undefined,
    categoryName: categoryName || undefined,
    subcategory: subcategoryName || undefined,
    subcategoryId: ad.subcategoryId || undefined,
    subcategoryName: subcategoryName || undefined,
    productId: ad.productId || undefined,
    productName: linkedProductName || undefined,
    serviceId: ad.serviceId || undefined,
    serviceName: linkedServiceName || undefined,
    price: typeof ad.price === 'number' ? ad.price : undefined,
    currency: ad.currency || 'NGN',
    location: sanitizedLocation,
    tags: Array.isArray(ad.tags) ? ad.tags : [],
    targetRadiusKm: typeof ad.targetRadiusKm === 'number' ? ad.targetRadiusKm : undefined,
    status: 'active',
    isBoosted: Boolean(ad.isBoosted),
    boostType: ad.boostPlan?.type || (ad.isBoosted ? 'featured' : undefined),
    contactPhone: ad.contactPhone || undefined,
    contactWhatsApp: ad.contactWhatsApp || undefined,
    createdAt: ad.createdAt,
    expiresAt: ad.expiresAt,
    business: publicBusiness
  };
}

export class AdvertisementService {
  /**
   * Search publicly discoverable advertisements with relevance scoring, relational matching, and pagination
   * (Epic 3 Feature 3.2 Task 3.2.4)
   */
  public async searchAdvertisements(queryParams: {
    q?: unknown;
    query?: unknown;
    search?: unknown;
    page?: unknown;
    limit?: unknown;
  }): Promise<AdvertisementSearchResponse> {
    const rawQuery = queryParams.q ?? queryParams.query ?? queryParams.search;

    const parsed = AdvertisementSearchQuerySchema.safeParse({
      q: rawQuery,
      page: queryParams.page,
      limit: queryParams.limit
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid search query.';
      const isTooLong = parsed.error.issues.some(i => i.message.includes('100'));
      const isRequiredOrEmpty = parsed.error.issues.some(i => i.message.includes('required') || i.message.includes('empty'));
      const code = isTooLong ? 'SEARCH_QUERY_TOO_LONG' : (isRequiredOrEmpty ? 'EMPTY_SEARCH_QUERY' : 'INVALID_SEARCH_QUERY');
      throw new AdvertisementServiceError(errorMsg, 400, code);
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
          continue; // Owner not in good standing: hide business and its advertisements
        }
      }
      validBusinesses.set(business.id, business);
    }

    // Pre-index products by businessId and by productId to prevent N+1 queries
    const productMap = new Map<string, Product>();
    const businessProducts = new Map<string, Product[]>();
    for (const prod of db.products.values()) {
      productMap.set(prod.id, prod);
      const list = businessProducts.get(prod.businessId) || [];
      list.push(prod);
      businessProducts.set(prod.businessId, list);
    }

    // Pre-index services by businessId and by serviceId to prevent N+1 queries
    const serviceMap = new Map<string, Service>();
    const businessServices = new Map<string, Service[]>();
    for (const serv of db.services.values()) {
      serviceMap.set(serv.id, serv);
      const list = businessServices.get(serv.businessId) || [];
      list.push(serv);
      businessServices.set(serv.businessId, list);
    }

    interface ScoredAd {
      ad: Advertisement;
      business: Business;
      score: number;
    }

    const matched: ScoredAd[] = [];
    const now = Date.now();

    // Query advertisements at database level
    for (const ad of db.advertisements.values()) {
      // 1. Visibility Check: Status must be 'active'
      if (ad.status !== 'active') {
        continue;
      }

      // 2. Expiry Check: If expiresAt is set, ensure it has not expired
      if (ad.expiresAt) {
        const expTime = new Date(ad.expiresAt).getTime();
        if (!isNaN(expTime) && expTime <= now) {
          continue;
        }
      }

      // 3. Owning business must exist and owner in good standing
      const business = validBusinesses.get(ad.businessId);
      if (!business) {
        continue;
      }

      // 4. Relational Category Names (from ad category/IDs or inherited from business)
      const categoryNames: string[] = [];
      const subcategoryNames: string[] = [];

      // Direct Ad Category
      if (ad.categoryId) {
        const cat = categoryMap.get(ad.categoryId.toLowerCase());
        if (cat) categoryNames.push(cat.name);
      }
      if (ad.category) {
        const cat = categoryMap.get(ad.category.toLowerCase());
        if (cat) categoryNames.push(cat.name);
        else categoryNames.push(ad.category);
      }

      // Direct Ad Subcategory
      if (ad.subcategoryId) {
        const sub = categoryMap.get(ad.subcategoryId.toLowerCase());
        if (sub) subcategoryNames.push(sub.name);
      }
      if (ad.subcategoryName) {
        if (!subcategoryNames.includes(ad.subcategoryName)) {
          subcategoryNames.push(ad.subcategoryName);
        }
      }
      if (ad.subcategory && !subcategoryNames.includes(ad.subcategory)) {
        subcategoryNames.push(ad.subcategory);
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

      // 5. Relational Products and Services
      const relProducts = businessProducts.get(ad.businessId) || [];
      const relServices = businessServices.get(ad.businessId) || [];

      // If ad links directly to a specific product / service
      let linkedProduct = ad.productId ? productMap.get(ad.productId) : undefined;
      let linkedService = ad.serviceId ? serviceMap.get(ad.serviceId) : undefined;

      const productText = [
        ad.productName || '',
        linkedProduct ? `${linkedProduct.name} ${linkedProduct.description}` : '',
        ...relProducts.map(p => `${p.name} ${p.description}`)
      ].join(' ').toLowerCase();

      const serviceText = [
        ad.serviceName || '',
        linkedService ? `${linkedService.name} ${linkedService.description}` : '',
        ...relServices.map(s => `${s.name} ${s.description}`)
      ].join(' ').toLowerCase();

      // Search fields
      const adTitle = (ad.title || '').toLowerCase();
      const adDesc = (ad.description || '').toLowerCase();
      const tagsText = (Array.isArray(ad.tags) ? ad.tags.join(' ') : '').toLowerCase();
      const bizName = (business.name || ad.businessName || '').toLowerCase();
      const bizDesc = (business.description || '').toLowerCase();
      const catText = categoryNames.join(' ').toLowerCase();
      const subcatText = subcategoryNames.join(' ').toLowerCase();
      const locationCity = (ad.location?.city || business.location?.city || '').toLowerCase();

      // Check matches
      const exactTitleMatch = adTitle === normalizedQuery;
      const prefixTitleMatch = adTitle.startsWith(normalizedQuery);
      const partialTitleMatch = adTitle.includes(normalizedQuery);
      const partialDescMatch = adDesc.includes(normalizedQuery);
      const tagsMatch = tagsText.includes(normalizedQuery);
      const partialBizMatch = bizName.includes(normalizedQuery) || bizDesc.includes(normalizedQuery);
      const partialCatMatch = catText.includes(normalizedQuery);
      const partialSubcatMatch = subcatText.includes(normalizedQuery);
      const productMatch = productText.includes(normalizedQuery);
      const serviceMatch = serviceText.includes(normalizedQuery);
      const cityMatch = locationCity.includes(normalizedQuery);

      let isMatch = exactTitleMatch || prefixTitleMatch || partialTitleMatch || partialDescMatch ||
                    tagsMatch || partialBizMatch || partialCatMatch || partialSubcatMatch || 
                    productMatch || serviceMatch || cityMatch;

      // Multi-word token matching (all words match across combined ad, business, product, service & category text)
      if (!isMatch && queryTokens.length > 1) {
        const combinedText = `${adTitle} ${adDesc} ${tagsText} ${bizName} ${bizDesc} ${catText} ${subcatText} ${productText} ${serviceText} ${locationCity}`;
        isMatch = queryTokens.every(tok => combinedText.includes(tok));
      }

      if (!isMatch) {
        continue;
      }

      // Calculate relevance score
      let score = 0;
      if (exactTitleMatch) score += 100;
      else if (prefixTitleMatch) score += 60;
      else if (partialTitleMatch) score += 40;

      if (ad.isBoosted) score += 30;
      if (business.isVerified) score += 25;
      if (bizName.includes(normalizedQuery)) score += 30;
      if (tagsMatch) score += 25;
      if (productMatch || serviceMatch) score += 20;
      if (partialCatMatch || partialSubcatMatch) score += 15;
      if (partialDescMatch) score += 10;
      if (cityMatch) score += 10;

      matched.push({
        ad,
        business,
        score
      });
    }

    // Sort by relevance score (descending), then recency
    matched.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(b.ad.createdAt).getTime() - new Date(a.ad.createdAt).getTime();
    });

    // Pagination
    const total = matched.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const offset = (page - 1) * limit;
    const paginatedSlice = matched.slice(offset, offset + limit);

    const advertisements = paginatedSlice.map(item => 
      toPublicAdvertisementProfile(item.ad, item.business, categoryMap, productMap, serviceMap)
    );

    return {
      success: true,
      advertisements,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Retrieve a single public advertisement by ID with security validation.
   * Returns null if advertisement does not exist, is draft/expired/rejected, or owned by an inactive/suspended merchant.
   */
  public async getPublicAdvertisementById(id: string): Promise<PublicAdvertisementProfile | null> {
    if (!id || typeof id !== 'string') return null;

    const ad = db.advertisements.get(id);
    if (!ad) return null;

    // Visibility Check
    if (ad.status !== 'active') return null;

    // Expiry Check
    if (ad.expiresAt) {
      const expTime = new Date(ad.expiresAt).getTime();
      if (!isNaN(expTime) && expTime <= Date.now()) return null;
    }

    // Business & Owner Check
    const business = db.businesses.get(ad.businessId);
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

    const productMap = new Map<string, Product>();
    for (const prod of db.products.values()) {
      productMap.set(prod.id, prod);
    }

    const serviceMap = new Map<string, Service>();
    for (const serv of db.services.values()) {
      serviceMap.set(serv.id, serv);
    }

    return toPublicAdvertisementProfile(ad, business, categoryMap, productMap, serviceMap);
  }
}

export const advertisementService = new AdvertisementService();
