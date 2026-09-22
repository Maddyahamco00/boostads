/**
 * Service Search Test Suite (Epic 3 Feature 3.2 Task 3.2.3)
 *
 * Verifies all 17 required criteria:
 * 1. Search by exact service name.
 * 2. Search by partial service name.
 * 3. Search is case-insensitive.
 * 4. Leading/trailing and redundant whitespace is handled safely.
 * 5. Search by service description keyword.
 * 6. Services associated with valid businesses can be found.
 * 7. Services from non-public/suspended businesses are not exposed.
 * 8. No-result search returns an empty result set (no fake data).
 * 9. Empty query is rejected with status 400 (EMPTY_SEARCH_QUERY).
 * 10. Excessively long/malformed query (>100 chars) is rejected with status 400 (SEARCH_QUERY_TOO_LONG).
 * 11. Sensitive/private fields (ownerId, credentials, private tokens) are never returned.
 * 12. Service-area only businesses mask street address and postal code.
 * 13. Pagination works correctly (page, limit, totalPages, offset slicing).
 * 14. Delivery mode is exposed and searchable ('remote', 'on-premise', 'at-client').
 * 15. Category and subcategory relational matching (direct and inherited).
 * 16. Relevance ranking prioritizes exact matches and verified merchants.
 * 17. Existing business search and product search remain operational and unbroken.
 */

import { db } from '../db';
import { serviceService, ServiceServiceError } from '../services/serviceService';
import { productService } from '../services/productService';
import { businessService } from '../services/businessService';
import { categoryService } from '../services/categoryService';
import { Business, Service } from '../../types';

export async function runServiceSearchTests() {
  console.log('================================================================');
  console.log('RUNNING TASK 3.2.3: SERVICE SEARCH TEST SUITE');
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
    // 1. Seed database taxonomy and test users
    categoryService.seedCategories();
    const topLevelCategories = db.getTopLevelCategories();
    const techCategory = topLevelCategories.find(c => c.name.toLowerCase().includes('tech')) || topLevelCategories[0];
    const autoCategory = topLevelCategories.find(c => c.name.toLowerCase().includes('service')) || topLevelCategories[1] || topLevelCategories[0];

    // Seed active merchant
    const activeOwnerId = `active-merchant-serv-${Date.now()}`;
    db.users.set(activeOwnerId, {
      id: activeOwnerId,
      name: 'Active Service Merchant',
      email: `active_serv_${Date.now()}@test.com`,
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'free',
      failedLoginAttempts: 0,
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Seed suspended merchant (for non-public business exclusion tests)
    const suspendedOwnerId = `suspended-merchant-serv-${Date.now()}`;
    db.users.set(suspendedOwnerId, {
      id: suspendedOwnerId,
      name: 'Suspended Service Merchant',
      email: `suspended_serv_${Date.now()}@test.com`,
      role: 'CLIENT',
      status: 'SUSPENDED',
      clientType: 'business',
      tier: 'free',
      failedLoginAttempts: 0,
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Seed active business (physical location)
    const activeBizId = `biz-active-serv-${Date.now()}`;
    const activeBusiness: Business = {
      id: activeBizId,
      name: 'OmniCloud Devops & Cloud Architecture Ltd',
      slug: 'omnicloud-devops',
      description: 'Enterprise Kubernetes, Terraform, and cloud migration engineering in Abuja.',
      ownerId: activeOwnerId,
      categoryId: techCategory.id,
      categoryLabel: techCategory.name,
      subcategoryId: 'sub_cloud_devops',
      subcategoryName: 'Cloud Infrastructure & DevOps',
      isVerified: true,
      location: {
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        address: 'Plot 402 Constitution Avenue',
        postalCode: '900001'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(activeBizId, activeBusiness);

    // Seed active business with service-area privacy (isServiceAreaOnly = true)
    const privacyBizId = `biz-privacy-serv-${Date.now()}`;
    const privacyBusiness: Business = {
      id: privacyBizId,
      name: 'Private Mobile Mechanic Express',
      slug: 'private-mobile-mechanic',
      description: 'Mobile on-demand vehicle repairs directly at your driveway.',
      ownerId: activeOwnerId,
      categoryId: autoCategory.id,
      categoryLabel: autoCategory.name,
      isVerified: false,
      location: {
        city: 'Kano',
        state: 'Kano',
        country: 'Nigeria',
        address: 'Secret Private Workshop Road 12',
        postalCode: '700001',
        isServiceAreaOnly: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(privacyBizId, privacyBusiness);

    // Seed suspended business
    const suspendedBizId = `biz-suspended-serv-${Date.now()}`;
    const suspendedBusiness: Business = {
      id: suspendedBizId,
      name: 'Suspended Digital Agency',
      slug: 'suspended-digital-agency',
      description: 'Suspended business offering SEO services.',
      ownerId: suspendedOwnerId,
      categoryId: techCategory.id,
      categoryLabel: techCategory.name,
      isVerified: false,
      location: {
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(suspendedBizId, suspendedBusiness);

    // Seed test services
    const sCloudId = `serv_cloud_${Date.now()}`;
    const sCloud: Service = {
      id: sCloudId,
      businessId: activeBizId,
      name: 'Enterprise Kubernetes & Terraform Cloud Migration Audit',
      description: 'Complete infrastructure review, zero-downtime microservices containerization, and automated CI/CD pipeline deployment.',
      startingPrice: 500000,
      currency: 'NGN',
      durationUnit: 'per project (2 weeks)',
      imageUrls: ['https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&auto=format&fit=crop&q=80'],
      category: 'Cloud Engineering',
      categoryId: techCategory.id,
      subcategoryId: 'sub_cloud_devops',
      subcategoryName: 'Cloud Infrastructure & DevOps',
      deliveryMode: 'remote',
      createdAt: new Date().toISOString()
    };
    db.services.set(sCloudId, sCloud);

    const sMechanicId = `serv_mechanic_${Date.now()}`;
    const sMechanic: Service = {
      id: sMechanicId,
      businessId: privacyBizId,
      name: 'Mobile Brake Pad Replacement & Rotor Resurfacing',
      description: 'Expert ceramic brake pad installation and hydraulic brake fluid bleed right at your home or office parking.',
      startingPrice: 18000,
      currency: 'NGN',
      durationUnit: 'per axle',
      imageUrls: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80'],
      category: 'Automotive Services',
      categoryId: autoCategory.id,
      deliveryMode: 'at-client',
      createdAt: new Date().toISOString()
    };
    db.services.set(sMechanicId, sMechanic);

    const sSuspendedId = `serv_suspended_${Date.now()}`;
    const sSuspended: Service = {
      id: sSuspendedId,
      businessId: suspendedBizId,
      name: 'Secret Darkweb SEO Backlink Booster',
      description: 'Unethical link building service from a suspended merchant account.',
      startingPrice: 999999,
      currency: 'NGN',
      durationUnit: 'per month',
      category: 'Marketing & Advertising',
      imageUrls: [],
      deliveryMode: 'remote',
      createdAt: new Date().toISOString()
    };
    db.services.set(sSuspendedId, sSuspended);

    // =========================================================================
    // Criterion 1: Search by exact service name
    // =========================================================================
    console.log('--- Criterion 1: Exact Service Name Search ---');
    const exactRes = await serviceService.searchServices({
      q: 'Enterprise Kubernetes & Terraform Cloud Migration Audit'
    });
    assert(
      exactRes.services.length > 0 && exactRes.services[0].id === sCloudId,
      'Exact service name search returns the intended service as top result'
    );

    // =========================================================================
    // Criterion 2: Search by partial service name
    // =========================================================================
    console.log('\n--- Criterion 2: Partial Service Name Search ---');
    const partialRes = await serviceService.searchServices({
      q: 'Brake Pad Replacement'
    });
    assert(
      partialRes.services.some(s => s.id === sMechanicId),
      'Partial service name search finds matching service'
    );

    // =========================================================================
    // Criterion 3: Search is case-insensitive
    // =========================================================================
    console.log('\n--- Criterion 3: Case-Insensitive Search ---');
    const lowerRes = await serviceService.searchServices({ q: 'kubernetes' });
    const upperRes = await serviceService.searchServices({ q: 'KUBERNETES' });
    const mixedRes = await serviceService.searchServices({ q: 'kUbErNeTeS' });
    assert(
      lowerRes.services.length > 0 &&
      lowerRes.services.length === upperRes.services.length &&
      lowerRes.services.length === mixedRes.services.length &&
      lowerRes.services[0].id === upperRes.services[0].id,
      'Search yields identical results across lowercase, uppercase, and mixed case'
    );

    // =========================================================================
    // Criterion 4: Leading, trailing, and redundant whitespace handling
    // =========================================================================
    console.log('\n--- Criterion 4: Whitespace Sanitization ---');
    const whitespaceRes = await serviceService.searchServices({
      q: '   Kubernetes    Terraform   '
    });
    assert(
      whitespaceRes.services.some(s => s.id === sCloudId),
      'Search with extra leading, trailing, and middle spaces resolves properly'
    );

    // =========================================================================
    // Criterion 5: Search by service description keyword
    // =========================================================================
    console.log('\n--- Criterion 5: Service Description Keyword Search ---');
    const descRes = await serviceService.searchServices({
      q: 'microservices containerization'
    });
    assert(
      descRes.services.some(s => s.id === sCloudId),
      'Keywords present exclusively in service description are matched'
    );

    // =========================================================================
    // Criterion 6: Services associated with valid businesses can be found
    // =========================================================================
    console.log('\n--- Criterion 6: Business Association Search ---');
    const bizRes = await serviceService.searchServices({
      q: 'OmniCloud Devops'
    });
    assert(
      bizRes.services.some(s => s.id === sCloudId && s.business?.name.includes('OmniCloud')),
      'Searching for owning business name returns its public services'
    );

    // =========================================================================
    // Criterion 7: Services from non-public/suspended businesses are not exposed
    // =========================================================================
    console.log('\n--- Criterion 7: Non-Public/Suspended Account Exclusion ---');
    const suspendedRes = await serviceService.searchServices({
      q: 'Secret Darkweb SEO'
    });
    assert(
      !suspendedRes.services.some(s => s.id === sSuspendedId),
      'Services belonging to suspended merchants are strictly omitted from public search results'
    );

    const directLookup = await serviceService.getPublicServiceById(sSuspendedId);
    assert(
      directLookup === null,
      'Direct public lookup by ID returns null for service from suspended owner'
    );

    // =========================================================================
    // Criterion 8: No-result search returns empty result set
    // =========================================================================
    console.log('\n--- Criterion 8: No-Result Search Returns Clean Empty Set ---');
    const noResultRes = await serviceService.searchServices({
      q: 'xyzNonExistentQuantumTeleportationService999'
    });
    assert(
      noResultRes.success === true &&
      Array.isArray(noResultRes.services) &&
      noResultRes.services.length === 0 &&
      noResultRes.total === 0,
      'No-result query returns 200 with empty array and does not generate mock services'
    );

    // =========================================================================
    // Criterion 9: Empty query is rejected with status 400 (EMPTY_SEARCH_QUERY)
    // =========================================================================
    console.log('\n--- Criterion 9: Empty Query Validation ---');
    let emptyQueryFailedAsExpected = false;
    try {
      await serviceService.searchServices({ q: '   ' });
    } catch (err: unknown) {
      if (err instanceof ServiceServiceError) {
        emptyQueryFailedAsExpected = err.statusCode === 400 && err.code === 'EMPTY_SEARCH_QUERY';
      }
    }
    assert(
      emptyQueryFailedAsExpected,
      'Empty or whitespace-only search query throws 400 with code EMPTY_SEARCH_QUERY'
    );

    // =========================================================================
    // Criterion 10: Excessively long query (>100 chars) is rejected with status 400
    // =========================================================================
    console.log('\n--- Criterion 10: Query Length Validation ---');
    let longQueryFailedAsExpected = false;
    try {
      await serviceService.searchServices({ q: 'a'.repeat(101) });
    } catch (err: unknown) {
      if (err instanceof ServiceServiceError) {
        longQueryFailedAsExpected = err.statusCode === 400 && err.code === 'SEARCH_QUERY_TOO_LONG';
      }
    }
    assert(
      longQueryFailedAsExpected,
      'Search query exceeding 100 characters throws 400 with code SEARCH_QUERY_TOO_LONG'
    );

    // =========================================================================
    // Criterion 11: Sensitive/private fields are omitted from response
    // =========================================================================
    console.log('\n--- Criterion 11: Sensitive Field Protection ---');
    const secRes = await serviceService.searchServices({ q: 'Kubernetes' });
    const firstService = secRes.services[0];
    const rawAny = firstService as unknown as Record<string, unknown>;
    assert(
      rawAny.ownerId === undefined &&
      rawAny.password === undefined &&
      rawAny.secretKey === undefined &&
      (rawAny.business as any)?.ownerId === undefined,
      'Public service response strictly strips ownerId, passwords, and sensitive keys'
    );

    // =========================================================================
    // Criterion 12: Service-area address masking
    // =========================================================================
    console.log('\n--- Criterion 12: Service-Area Privacy Masking ---');
    const privacyRes = await serviceService.searchServices({ q: 'Brake Pad' });
    const privacyService = privacyRes.services.find(s => s.id === sMechanicId);
    assert(
      Boolean(privacyService?.business?.location) &&
      (privacyService?.business?.location as any)?.address === undefined &&
      (privacyService?.business?.location as any)?.postalCode === undefined &&
      privacyService?.business?.location?.city === 'Kano',
      'For isServiceAreaOnly businesses, address and postalCode are masked while city and state are preserved'
    );

    // =========================================================================
    // Criterion 13: Pagination support
    // =========================================================================
    console.log('\n--- Criterion 13: Pagination Support ---');
    const page1 = await serviceService.searchServices({ q: 'service', page: 1, limit: 1 });
    const page2 = await serviceService.searchServices({ q: 'service', page: 2, limit: 1 });
    assert(
      page1.services.length === 1 &&
      page1.page === 1 &&
      page1.limit === 1 &&
      page1.total >= 2 &&
      page1.totalPages >= 2 &&
      page1.hasMore === true,
      'Page 1 returns 1 item with hasMore = true and totalPages >= 2'
    );
    assert(
      page2.services.length === 1 &&
      page2.page === 2 &&
      page1.services[0].id !== page2.services[0].id,
      'Page 2 returns the next item distinct from page 1'
    );

    // =========================================================================
    // Criterion 14: Delivery mode is exposed and searchable
    // =========================================================================
    console.log('\n--- Criterion 14: Delivery Mode Exposure & Search ---');
    const remoteRes = await serviceService.searchServices({ q: 'remote' });
    assert(
      remoteRes.services.some(s => s.deliveryMode === 'remote'),
      'Delivery mode "remote" is searchable and exposed in DTO'
    );
    const clientRes = await serviceService.searchServices({ q: 'at-client' });
    assert(
      clientRes.services.some(s => s.deliveryMode === 'at-client'),
      'Delivery mode "at-client" is searchable and exposed in DTO'
    );

    // =========================================================================
    // Criterion 15: Category and Subcategory matching
    // =========================================================================
    console.log('\n--- Criterion 15: Category & Subcategory Matching ---');
    const catRes = await serviceService.searchServices({ q: 'Cloud Infrastructure' });
    assert(
      catRes.services.some(s => s.id === sCloudId),
      'Services match on their subcategory name ("Cloud Infrastructure & DevOps")'
    );

    // =========================================================================
    // Criterion 16: Relevance ranking
    // =========================================================================
    console.log('\n--- Criterion 16: Relevance Ranking ---');
    const rankRes = await serviceService.searchServices({ q: 'Kubernetes' });
    assert(
      rankRes.services.length > 0 && rankRes.services[0].id === sCloudId,
      'Title match with verified business ranks at the top'
    );

    // =========================================================================
    // Criterion 17: Existing business search and product search remain operational
    // =========================================================================
    console.log('\n--- Criterion 17: Existing Search Integrity ---');
    const bizSearch = await businessService.searchBusinesses({ q: 'Apex' });
    assert(
      bizSearch.success === true && bizSearch.businesses.length > 0,
      'Existing business search remains functional and responsive'
    );
    const prodSearch = await productService.searchProducts({ q: 'device' });
    assert(
      prodSearch.success === true && Array.isArray(prodSearch.products),
      'Existing product search remains functional and responsive'
    );

    console.log('\n================================================================');
    console.log(`TASK 3.2.3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    return { passed, failed };
  } catch (error) {
    console.error('Fatal error during test run:', error);
    return { passed, failed: failed + 1 };
  }
}

// Execute tests if run directly
if (process.argv[1]?.includes('serviceSearch.test.ts')) {
  runServiceSearchTests()
    .then(result => {
      if (result.failed > 0) process.exit(1);
    })
    .catch(() => process.exit(1));
}
