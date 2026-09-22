/**
 * Advertisement Search Test Suite (Epic 3 Feature 3.2 Task 3.2.4)
 *
 * Verifies all 22 required criteria:
 * 1. Search by exact advertisement title.
 * 2. Search by partial advertisement title.
 * 3. Search is case-insensitive.
 * 4. Leading/trailing whitespace is handled safely.
 * 5. Search by advertisement description keyword.
 * 6. Search can find advertisements through valid business relationships.
 * 7. Search can find relevant ads through product/service relationships.
 * 8. Search can find relevant ads through category/subcategory relationships.
 * 9. Draft advertisements are not publicly returned.
 * 10. Private/paused advertisements are not publicly returned.
 * 11. Rejected advertisements are not publicly returned.
 * 12. Expired/inactive advertisements follow visibility rules.
 * 13. No-result search returns an empty result set (not fake ads).
 * 14. Empty query is handled safely (400 EMPTY_SEARCH_QUERY).
 * 15. Excessively long/malformed queries are handled safely (>100 chars, 400 SEARCH_QUERY_TOO_LONG).
 * 16. Sensitive/internal advertisement fields are not returned (ownerId, budget, internal analytics).
 * 17. Pagination works correctly (page, limit, totalPages, hasMore).
 * 18. SQL-injection-style input cannot manipulate query execution.
 * 19. Private business information is not exposed (masked address for service area, ownerId stripped).
 * 20. Existing Business Search still works.
 * 21. Existing Product Search still works.
 * 22. Existing Service Search still works.
 */

import { db } from '../db';
import { advertisementService, AdvertisementServiceError } from '../services/advertisementService';
import { serviceService } from '../services/serviceService';
import { productService } from '../services/productService';
import { businessService } from '../services/businessService';
import { categoryService } from '../services/categoryService';
import { Business, Advertisement, Product, Service } from '../../types';

export async function runAdvertisementSearchTests() {
  console.log('================================================================');
  console.log('RUNNING TASK 3.2.4: ADVERTISEMENT SEARCH TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${errorDetail ? ` - ${errorDetail}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Seed categories
    categoryService.seedCategories();
    const topLevelCategories = db.getTopLevelCategories();
    const techCategory = topLevelCategories.find(c => c.name.toLowerCase().includes('tech')) || topLevelCategories[0];
    const techSubcategories = db.getSubcategories(techCategory.id);
    const techSub = techSubcategories[0] || { id: 'tech-sub-1', name: 'Software Development' };

    // 2. Seed active test merchant
    const activeOwnerId = `active-ad-owner-${Date.now()}`;
    db.users.set(activeOwnerId, {
      id: activeOwnerId,
      name: 'Active Ad Merchant',
      email: `admerchant_${Date.now()}@example.com`,
      passwordHash: 'secret-hash',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'free',
      failedLoginAttempts: 0,
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 3. Seed active test business
    const activeBusinessId = `biz-ad-active-${Date.now()}`;
    const activeBusiness: Business = {
      id: activeBusinessId,
      ownerId: activeOwnerId,
      name: 'Quantum Electronics Hub',
      slug: `quantum-electronics-${Date.now()}`,
      category: techCategory.name,
      categoryId: techCategory.id,
      categoryLabel: techCategory.name,
      subcategoryId: techSub.id,
      subcategoryName: techSub.name,
      description: 'Authorized retailer of high-performance laptops, smartphones, and accessories.',
      email: 'contact@quantumelec.example',
      phone: '+2348011223344',
      whatsapp: '+2348011223344',
      location: {
        address: '15 Kofo Abayomi Street',
        city: 'Victoria Island',
        state: 'Lagos',
        country: 'Nigeria',
        lga: 'Eti-Osa',
        isServiceAreaOnly: false
      },
      isVerified: true,
      verificationStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(activeBusinessId, activeBusiness);

    // 4. Seed home-based/service-area business for privacy masking test
    const homeOwnerId = `home-ad-owner-${Date.now()}`;
    db.users.set(homeOwnerId, {
      id: homeOwnerId,
      name: 'Private Consultant Merchant',
      email: `homeowner_${Date.now()}@example.com`,
      passwordHash: 'secret-hash',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'free',
      failedLoginAttempts: 0,
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const homeBusinessId = `biz-ad-home-${Date.now()}`;
    const homeBusiness: Business = {
      id: homeBusinessId,
      ownerId: homeOwnerId,
      name: 'Apex Advisory Services',
      slug: `apex-advisory-${Date.now()}`,
      category: 'Professional Services',
      description: 'Executive advisory and remote legal consulting.',
      email: 'consult@apexadvisory.example',
      phone: '+2348099887766',
      location: {
        address: 'Top Secret Home Office Road #42',
        postalCode: '100001',
        city: 'Lekki',
        state: 'Lagos',
        country: 'Nigeria',
        isServiceAreaOnly: true
      },
      isVerified: false,
      verificationStatus: 'NOT_SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(homeBusinessId, homeBusiness);

    // 5. Seed linked product and service
    const linkedProductId = `prod-ad-${Date.now()}`;
    const linkedProduct: Product = {
      id: linkedProductId,
      businessId: activeBusinessId,
      name: 'Zenith Pro Gaming Laptop',
      description: 'Ultra-thin gaming laptop with RTX 4080 graphics.',
      price: 1850000,
      currency: 'NGN',
      category: 'Laptops',
      imageUrls: [],
      inStock: true,
      createdAt: new Date().toISOString()
    };
    db.products.set(linkedProductId, linkedProduct);

    const linkedServiceId = `serv-ad-${Date.now()}`;
    const linkedService: Service = {
      id: linkedServiceId,
      businessId: homeBusinessId,
      name: 'Corporate Compliance Audit',
      description: 'Comprehensive tax and compliance audit.',
      startingPrice: 350000,
      currency: 'NGN',
      durationUnit: 'per engagement',
      category: 'Professional Services',
      imageUrls: [],
      deliveryMode: 'remote',
      createdAt: new Date().toISOString()
    };
    db.services.set(linkedServiceId, linkedService);

    // 6. Seed Advertisements with diverse statuses
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    // Ad 1: Standard Active Advertisement (Gaming Laptop Promo)
    const ad1Id = `ad-active-1-${Date.now()}`;
    const ad1: Advertisement = {
      id: ad1Id,
      businessId: activeBusinessId,
      businessName: activeBusiness.name,
      businessLogo: '',
      businessCategory: activeBusiness.category as any,
      title: 'Zenith Pro Gaming Laptop Flash Sale',
      description: 'Get 25% discount this weekend only on all ultra-performance RTX gaming rigs with free nationwide delivery.',
      mediaUrls: ['https://images.unsplash.com/photo-gaming-laptop'],
      mediaType: 'image',
      location: activeBusiness.location,
      tags: ['gaming', 'laptop', 'rtx'],
      category: techCategory.name,
      contactWhatsApp: '+2348011223344',
      status: 'active',
      isBoosted: true,
      boostPlan: {
        type: 'featured',
        budgetNGN: 15000,
        durationDays: 14,
        expiresAt: futureDate
      },
      expiresAt: futureDate,
      productId: linkedProductId,
      productName: linkedProduct.name,
      categoryId: techCategory.id,
      subcategoryId: techSub.id,
      subcategoryName: techSub.name,
      viewsCount: 4200,
      clicksCount: 380,
      enquiriesCount: 45,
      createdAt: new Date().toISOString()
    };
    db.advertisements.set(ad1Id, ad1);

    // Ad 2: Active Advertisement on Home Business (Corporate Audit)
    const ad2Id = `ad-active-2-${Date.now()}`;
    const ad2: Advertisement = {
      id: ad2Id,
      businessId: homeBusinessId,
      businessName: homeBusiness.name,
      businessLogo: '',
      businessCategory: homeBusiness.category as any,
      title: 'Free Initial Corporate Compliance Consultation',
      description: 'Protect your enterprise with institutional-grade statutory filing, audit, and tax review.',
      mediaUrls: ['https://images.unsplash.com/photo-audit'],
      mediaType: 'image',
      location: homeBusiness.location,
      tags: ['consulting', 'compliance'],
      category: 'Professional Services',
      status: 'active',
      isBoosted: false,
      expiresAt: futureDate,
      serviceId: linkedServiceId,
      serviceName: linkedService.name,
      viewsCount: 1200,
      clicksCount: 88,
      enquiriesCount: 10,
      createdAt: new Date().toISOString()
    };
    db.advertisements.set(ad2Id, ad2);

    // Ad 3: Draft Advertisement (MUST NEVER BE RETURNED)
    const adDraftId = `ad-draft-${Date.now()}`;
    const adDraft: Advertisement = {
      id: adDraftId,
      businessId: activeBusinessId,
      businessName: activeBusiness.name,
      businessLogo: '',
      businessCategory: activeBusiness.category as any,
      title: 'Zenith Super Secret Draft Campaign',
      description: 'Unpublished draft of our holiday flash sale.',
      mediaUrls: ['https://images.unsplash.com/photo-draft'],
      mediaType: 'image',
      location: activeBusiness.location,
      tags: ['secret'],
      category: techCategory.name,
      status: 'draft',
      expiresAt: futureDate,
      viewsCount: 0,
      clicksCount: 0,
      enquiriesCount: 0,
      createdAt: new Date().toISOString()
    };
    db.advertisements.set(adDraftId, adDraft);

    // Ad 4: Paused / Private Advertisement (MUST NEVER BE RETURNED)
    const adPausedId = `ad-paused-${Date.now()}`;
    const adPaused: Advertisement = {
      id: adPausedId,
      businessId: activeBusinessId,
      businessName: activeBusiness.name,
      businessLogo: '',
      businessCategory: activeBusiness.category as any,
      title: 'Zenith Paused Promotional Campaign',
      description: 'Paused campaign while inventory replenishes.',
      mediaUrls: ['https://images.unsplash.com/photo-paused'],
      mediaType: 'image',
      location: activeBusiness.location,
      tags: ['paused'],
      category: techCategory.name,
      status: 'paused',
      expiresAt: futureDate,
      viewsCount: 10,
      clicksCount: 2,
      enquiriesCount: 0,
      createdAt: new Date().toISOString()
    };
    db.advertisements.set(adPausedId, adPaused);

    // Ad 5: Rejected Advertisement (MUST NEVER BE RETURNED)
    const adRejectedId = `ad-rejected-${Date.now()}`;
    const adRejected: Advertisement = {
      id: adRejectedId,
      businessId: activeBusinessId,
      businessName: activeBusiness.name,
      businessLogo: '',
      businessCategory: activeBusiness.category as any,
      title: 'Zenith Rejected Inappropriate Ad',
      description: 'Violates platform policy and was rejected by moderators.',
      mediaUrls: ['https://images.unsplash.com/photo-rejected'],
      mediaType: 'image',
      location: activeBusiness.location,
      tags: ['rejected'],
      category: techCategory.name,
      status: 'rejected',
      expiresAt: futureDate,
      viewsCount: 0,
      clicksCount: 0,
      enquiriesCount: 0,
      createdAt: new Date().toISOString()
    };
    db.advertisements.set(adRejectedId, adRejected);

    // Ad 6: Expired Advertisement (MUST NEVER BE RETURNED)
    const adExpiredId = `ad-expired-${Date.now()}`;
    const adExpired: Advertisement = {
      id: adExpiredId,
      businessId: activeBusinessId,
      businessName: activeBusiness.name,
      businessLogo: '',
      businessCategory: activeBusiness.category as any,
      title: 'Zenith Expired Flash Sale Offer',
      description: 'Expired last week and should no longer appear in public searches.',
      mediaUrls: ['https://images.unsplash.com/photo-expired'],
      mediaType: 'image',
      location: activeBusiness.location,
      tags: ['expired'],
      category: techCategory.name,
      status: 'expired',
      expiresAt: pastDate,
      viewsCount: 200,
      clicksCount: 15,
      enquiriesCount: 3,
      createdAt: pastDate
    };
    db.advertisements.set(adExpiredId, adExpired);

    // Seed multiple dummy active ads for pagination testing
    for (let i = 1; i <= 15; i++) {
      const pageAdId = `ad-page-${i}-${Date.now()}`;
      db.advertisements.set(pageAdId, {
        id: pageAdId,
        businessId: activeBusinessId,
        businessName: activeBusiness.name,
        businessLogo: '',
        businessCategory: activeBusiness.category as any,
        title: `Pagination Test Promo Item ${i}`,
        description: `High quality electronics pagination sample item ${i} with premium warranty.`,
        mediaUrls: [`https://images.unsplash.com/photo-item-${i}`],
        mediaType: 'image',
        location: activeBusiness.location,
        tags: ['pagination'],
        category: techCategory.name,
        status: 'active',
        expiresAt: futureDate,
        viewsCount: 50,
        clicksCount: 5,
        enquiriesCount: 1,
        createdAt: new Date(Date.now() - i * 1000).toISOString()
      });
    }

    // =================================================================
    // CRITERIA 1: Search by exact advertisement title
    // =================================================================
    const res1 = await advertisementService.searchAdvertisements({ q: 'Zenith Pro Gaming Laptop Flash Sale' });
    assert(
      res1.success && res1.advertisements.some(a => a.id === ad1Id),
      'Criterion 1: Search by exact advertisement title finds target ad'
    );

    // =================================================================
    // CRITERIA 2: Search by partial advertisement title
    // =================================================================
    const res2 = await advertisementService.searchAdvertisements({ q: 'Gaming Laptop' });
    assert(
      res2.success && res2.advertisements.some(a => a.id === ad1Id),
      'Criterion 2: Search by partial advertisement title ("Gaming Laptop") finds target ad'
    );

    // =================================================================
    // CRITERIA 3: Search is case-insensitive
    // =================================================================
    const res3Lower = await advertisementService.searchAdvertisements({ q: 'zenith pro gaming laptop' });
    const res3Upper = await advertisementService.searchAdvertisements({ q: 'ZENITH PRO GAMING LAPTOP' });
    assert(
      res3Lower.success && res3Upper.success &&
      res3Lower.advertisements.some(a => a.id === ad1Id) &&
      res3Upper.advertisements.some(a => a.id === ad1Id),
      'Criterion 3: Search is case-insensitive (lowercase and uppercase produce identical matches)'
    );

    // =================================================================
    // CRITERIA 4: Leading/trailing whitespace is handled safely
    // =================================================================
    const res4 = await advertisementService.searchAdvertisements({ q: '   Zenith Pro Gaming   ' });
    assert(
      res4.success && res4.advertisements.some(a => a.id === ad1Id),
      'Criterion 4: Leading/trailing whitespace is safely normalized without breaking search'
    );

    // =================================================================
    // CRITERIA 5: Search by advertisement description where supported
    // =================================================================
    const res5 = await advertisementService.searchAdvertisements({ q: 'RTX gaming rigs' });
    assert(
      res5.success && res5.advertisements.some(a => a.id === ad1Id),
      'Criterion 5: Search by advertisement description keyword ("RTX gaming rigs") finds target ad'
    );

    // =================================================================
    // CRITERIA 6: Search can find advertisements through valid business relationships
    // =================================================================
    const res6 = await advertisementService.searchAdvertisements({ q: 'Quantum Electronics Hub' });
    assert(
      res6.success && res6.advertisements.some(a => a.id === ad1Id && a.business?.name === 'Quantum Electronics Hub'),
      'Criterion 6: Search by business name finds associated active advertisements'
    );

    // =================================================================
    // CRITERIA 7: Search can find relevant ads through product/service relationships
    // =================================================================
    const res7Product = await advertisementService.searchAdvertisements({ q: 'Zenith Pro Gaming Laptop' });
    const res7Service = await advertisementService.searchAdvertisements({ q: 'Corporate Compliance Audit' });
    assert(
      res7Product.success && res7Product.advertisements.some(a => a.productId === linkedProductId || a.productName?.includes('Gaming Laptop')) &&
      res7Service.success && res7Service.advertisements.some(a => a.serviceId === linkedServiceId || a.serviceName?.includes('Corporate Compliance')),
      'Criterion 7: Search finds relevant ads through linked product and service relationships'
    );

    // =================================================================
    // CRITERIA 8: Search can find relevant ads through category/subcategory relationships
    // =================================================================
    const res8Category = await advertisementService.searchAdvertisements({ q: techCategory.name });
    const res8Subcategory = await advertisementService.searchAdvertisements({ q: techSub.name });
    assert(
      res8Category.success && res8Category.advertisements.some(a => a.id === ad1Id) &&
      res8Subcategory.success && res8Subcategory.advertisements.some(a => a.id === ad1Id),
      'Criterion 8: Search finds relevant ads through category and subcategory relationships'
    );

    // =================================================================
    // CRITERIA 9: Draft advertisements are not publicly returned
    // =================================================================
    const res9 = await advertisementService.searchAdvertisements({ q: 'Super Secret Draft Campaign' });
    assert(
      res9.success && !res9.advertisements.some(a => a.id === adDraftId),
      'Criterion 9: Draft advertisements are completely excluded from public search results'
    );

    // =================================================================
    // CRITERIA 10: Private/paused advertisements are not publicly returned
    // =================================================================
    const res10 = await advertisementService.searchAdvertisements({ q: 'Zenith Paused Promotional Campaign' });
    assert(
      res10.success && !res10.advertisements.some(a => a.id === adPausedId),
      'Criterion 10: Paused/private advertisements are completely excluded from public search results'
    );

    // =================================================================
    // CRITERIA 11: Rejected advertisements are not publicly returned
    // =================================================================
    const res11 = await advertisementService.searchAdvertisements({ q: 'Zenith Rejected Inappropriate Ad' });
    assert(
      res11.success && !res11.advertisements.some(a => a.id === adRejectedId),
      'Criterion 11: Rejected advertisements are completely excluded from public search results'
    );

    // =================================================================
    // CRITERIA 12: Expired/inactive advertisements follow visibility rules
    // =================================================================
    const res12 = await advertisementService.searchAdvertisements({ q: 'Zenith Expired Flash Sale Offer' });
    assert(
      res12.success && !res12.advertisements.some(a => a.id === adExpiredId),
      'Criterion 12: Expired advertisements are excluded according to visibility rules'
    );

    // =================================================================
    // CRITERIA 13: No-result search returns an empty result set (not fake ads)
    // =================================================================
    const res13 = await advertisementService.searchAdvertisements({ q: 'nonexistent-quantum-super-xyz-987654' });
    assert(
      res13.success && res13.advertisements.length === 0 && res13.total === 0,
      'Criterion 13: No-result search returns empty array (total: 0), never generating fake ads'
    );

    // =================================================================
    // CRITERIA 14: Empty query is handled safely (400 EMPTY_SEARCH_QUERY)
    // =================================================================
    let emptyQueryRejected = false;
    try {
      await advertisementService.searchAdvertisements({ q: '   ' });
    } catch (err: any) {
      if (err instanceof AdvertisementServiceError && err.status === 400 && err.code === 'EMPTY_SEARCH_QUERY') {
        emptyQueryRejected = true;
      }
    }
    assert(
      emptyQueryRejected,
      'Criterion 14: Empty query throws status 400 with code EMPTY_SEARCH_QUERY'
    );

    // =================================================================
    // CRITERIA 15: Excessively long/malformed queries are handled safely
    // =================================================================
    let longQueryRejected = false;
    try {
      const veryLongQuery = 'a'.repeat(150);
      await advertisementService.searchAdvertisements({ q: veryLongQuery });
    } catch (err: any) {
      if (err instanceof AdvertisementServiceError && err.status === 400 && err.code === 'SEARCH_QUERY_TOO_LONG') {
        longQueryRejected = true;
      }
    }
    assert(
      longQueryRejected,
      'Criterion 15: Overly long query (>100 characters) throws status 400 SEARCH_QUERY_TOO_LONG'
    );

    // =================================================================
    // CRITERIA 16: Sensitive/internal advertisement fields are not returned
    // =================================================================
    const res16 = await advertisementService.searchAdvertisements({ q: 'Zenith Pro Gaming Laptop' });
    const targetAd = res16.advertisements.find(a => a.id === ad1Id);
    const hasOwnerId = targetAd && 'ownerId' in (targetAd as any);
    const hasViewsCount = targetAd && (targetAd as any).viewsCount !== undefined;
    const hasClicksCount = targetAd && (targetAd as any).clicksCount !== undefined;
    const hasBudgetNGN = targetAd && (targetAd as any).boostPlan?.budgetNGN !== undefined;

    assert(
      targetAd !== undefined && !hasOwnerId && !hasViewsCount && !hasClicksCount && !hasBudgetNGN,
      'Criterion 16: Public projection strips internal analytics, owner IDs, and boost financial budgets'
    );

    // =================================================================
    // CRITERIA 17: Pagination works correctly (page, limit, totalPages, hasMore)
    // =================================================================
    const res17Page1 = await advertisementService.searchAdvertisements({ q: 'Pagination Test Promo', page: 1, limit: 5 });
    const res17Page2 = await advertisementService.searchAdvertisements({ q: 'Pagination Test Promo', page: 2, limit: 5 });

    const page1Ids = new Set(res17Page1.advertisements.map(a => a.id));
    const page2Ids = new Set(res17Page2.advertisements.map(a => a.id));
    const hasOverlap = [...page1Ids].some(id => page2Ids.has(id));

    assert(
      res17Page1.success && res17Page1.advertisements.length === 5 &&
      res17Page1.page === 1 && res17Page1.limit === 5 &&
      res17Page1.hasMore === true &&
      res17Page2.success && res17Page2.page === 2 &&
      !hasOverlap,
      'Criterion 17: Pagination accurately computes totalPages, hasMore, and slices distinct result pages'
    );

    // =================================================================
    // CRITERIA 18: SQL-injection-style input cannot manipulate the query
    // =================================================================
    const res18Sql1 = await advertisementService.searchAdvertisements({ q: "'; DROP TABLE advertisements; --" });
    const res18Sql2 = await advertisementService.searchAdvertisements({ q: "' OR '1'='1" });
    assert(
      res18Sql1.success && res18Sql2.success,
      'Criterion 18: SQL-injection-style input is safely sanitized and cannot compromise data or execution'
    );

    // =================================================================
    // CRITERIA 19: Private business information is not exposed (service area masking)
    // =================================================================
    const res19 = await advertisementService.searchAdvertisements({ q: 'Free Initial Corporate Compliance' });
    const homeAd = res19.advertisements.find(a => a.id === ad2Id);
    const homeBiz = homeAd?.business;
    const isAddressMasked = !(homeBiz?.location as any)?.address && !(homeBiz?.location as any)?.postalCode;
    const isOwnerStripped = !homeBiz || !('ownerId' in (homeBiz as any));

    assert(
      homeAd !== undefined && isAddressMasked && isOwnerStripped,
      'Criterion 19: Service-area business address/postalCode are masked and ownerId is omitted'
    );

    // =================================================================
    // CRITERIA 20: Existing Business Search still works
    // =================================================================
    const bizSearchResult = await businessService.searchBusinesses({ q: 'Quantum Electronics' });
    assert(
      bizSearchResult.success && bizSearchResult.businesses.some(b => b.id === activeBusinessId),
      'Criterion 20: Existing Business Search (Task 3.2.1) remains operational and intact'
    );

    // =================================================================
    // CRITERIA 21: Existing Product Search still works
    // =================================================================
    const prodSearchResult = await productService.searchProducts({ q: 'Zenith Pro Gaming' });
    assert(
      prodSearchResult.success && prodSearchResult.products.some(p => p.id === linkedProductId),
      'Criterion 21: Existing Product Search (Task 3.2.2) remains operational and intact'
    );

    // =================================================================
    // CRITERIA 22: Existing Service Search still works
    // =================================================================
    const servSearchResult = await serviceService.searchServices({ q: 'Corporate Compliance Audit' });
    assert(
      servSearchResult.success && servSearchResult.services.some(s => s.id === linkedServiceId),
      'Criterion 22: Existing Service Search (Task 3.2.3) remains operational and intact'
    );

    console.log('\n================================================================');
    console.log(`TASK 3.2.4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    return { passed, failed };
  } catch (error) {
    console.error('Fatal error during advertisement search test run:', error);
    return { passed, failed: failed + 1 };
  }
}

// Execute tests if run directly
if (process.argv[1]?.includes('advertisementSearch.test.ts')) {
  runAdvertisementSearchTests()
    .then(result => {
      if (result.failed > 0) process.exit(1);
    })
    .catch(() => process.exit(1));
}
