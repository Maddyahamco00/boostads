/**
 * Product Search Test Suite (Epic 3 Feature 3.2 Task 3.2.2)
 *
 * Verifies all 16 required criteria:
 * 1. Search by exact product name.
 * 2. Search by partial product name.
 * 3. Search is case-insensitive.
 * 4. Leading/trailing whitespace is handled.
 * 5. Search by product description where supported.
 * 6. Products associated with valid businesses can be found.
 * 7. Products from non-public businesses/products are not exposed.
 * 8. No-result search returns an empty result set.
 * 9. Empty query is handled safely.
 * 10. Excessively long/malformed query is handled safely.
 * 11. Sensitive/private fields are not returned.
 * 12. Pagination works correctly.
 * 13. SQL-injection-style input cannot manipulate the query.
 * 14. Existing business search still works.
 * 15. Existing category/subcategory relationships still work.
 * 16. Unauthorized/private product data cannot be retrieved by manipulating IDs or parameters.
 */

import { db, SUPER_ADMIN_ID } from '../db';
import { productService, ProductServiceError } from '../services/productService';
import { businessService } from '../services/businessService';
import { categoryService } from '../services/categoryService';
import { Business, Product } from '../../types';

async function runProductSearchTests() {
  console.log('================================================================');
  console.log('RUNNING TASK 3.2.2: PRODUCT SEARCH TEST SUITE');
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
    const allCategories = db.categories;
    const topLevelCategories = db.getTopLevelCategories();

    const techCategory = topLevelCategories.find(c => c.name.toLowerCase().includes('tech')) || topLevelCategories[0];
    const foodCategory = topLevelCategories.find(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('agriculture')) || topLevelCategories[1] || topLevelCategories[0];

    // Seed active merchant
    const activeOwnerId = `active-merchant-prod-${Date.now()}`;
    db.users.set(activeOwnerId, {
      id: activeOwnerId,
      name: 'Active Product Merchant',
      email: `active_prod_${Date.now()}@test.com`,
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
    const suspendedOwnerId = `suspended-merchant-prod-${Date.now()}`;
    db.users.set(suspendedOwnerId, {
      id: suspendedOwnerId,
      name: 'Suspended Product Merchant',
      email: `suspended_prod_${Date.now()}@test.com`,
      role: 'CLIENT',
      status: 'SUSPENDED',
      clientType: 'business',
      tier: 'free',
      failedLoginAttempts: 0,
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Seed active business
    const activeBizId = `biz-active-prod-${Date.now()}`;
    const activeBusiness: Business = {
      id: activeBizId,
      name: 'Apex Devices & Gadgets Emporium',
      slug: 'apex-devices-gadgets',
      description: 'Premier supplier of high performance mobile devices and electronics in Lagos.',
      ownerId: activeOwnerId,
      categoryId: techCategory.id,
      categoryLabel: techCategory.name,
      isVerified: true,
      location: {
        city: 'Ikeja',
        state: 'Lagos',
        country: 'Nigeria',
        address: 'Secret Warehouse Address 42, Private Suite',
        postalCode: '100001'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(activeBizId, activeBusiness);

    // Seed suspended business
    const suspendedBizId = `biz-suspended-prod-${Date.now()}`;
    const suspendedBusiness: Business = {
      id: suspendedBizId,
      name: 'Blacklist Shadow Electronics',
      slug: 'blacklist-shadow-electronics',
      description: 'De-listed store due to policy infractions.',
      ownerId: suspendedOwnerId,
      categoryId: techCategory.id,
      categoryLabel: techCategory.name,
      isVerified: false,
      location: {
        city: 'Kano',
        state: 'Kano',
        country: 'Nigeria'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(suspendedBizId, suspendedBusiness);

    // Seed test products
    const p1Id = `prod-flagship-phone-${Date.now()}`;
    const p1: Product = {
      id: p1Id,
      businessId: activeBizId,
      name: 'Apex Horizon Ultra Pro Smartphone',
      description: 'Next-generation 5G flagship phone with 200MP camera and 5000mAh battery life.',
      price: 450000,
      currency: 'NGN',
      imageUrls: ['https://images.unsplash.com/photo-1511707171634-5f897ff02543?w=600'],
      category: techCategory.name,
      categoryId: techCategory.id,
      inStock: true,
      sku: 'APX-PHN-001',
      createdAt: new Date().toISOString()
    };
    db.createProduct(p1);

    const p2Id = `prod-wireless-buds-${Date.now()}`;
    const p2: Product = {
      id: p2Id,
      businessId: activeBizId,
      name: 'Apex Sonic Wireless Noise-Cancelling Earbuds',
      description: 'Crisp studio-grade acoustics with active hybrid ANC and 36-hour charging case.',
      price: 45000,
      currency: 'NGN',
      imageUrls: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600'],
      category: techCategory.name,
      categoryId: techCategory.id,
      inStock: false, // out of stock test
      sku: 'APX-EAR-002',
      createdAt: new Date().toISOString()
    };
    db.createProduct(p2);

    const p3SuspendedId = `prod-suspended-device-${Date.now()}`;
    const p3Suspended: Product = {
      id: p3SuspendedId,
      businessId: suspendedBizId, // Belongs to suspended merchant
      name: 'Secret Contraband Phone 9000',
      description: 'Should never appear in public search results.',
      price: 999999,
      currency: 'NGN',
      imageUrls: [],
      category: techCategory.name,
      inStock: true,
      sku: 'BAD-PHN-999',
      createdAt: new Date().toISOString()
    };
    db.createProduct(p3Suspended);

    // --- TEST 1: Search by exact product name ---
    const resExact = await productService.searchProducts({ q: 'Apex Horizon Ultra Pro Smartphone' });
    assert(
      resExact.success && resExact.products.some(p => p.id === p1Id),
      '1. Search by exact product name returns the matching product'
    );

    // --- TEST 2: Search by partial product name ---
    const resPartial = await productService.searchProducts({ q: 'Horizon Ultra' });
    assert(
      resPartial.success && resPartial.products.some(p => p.id === p1Id),
      '2. Search by partial product name returns the matching product'
    );

    // --- TEST 3: Search is case-insensitive ---
    const resCase = await productService.searchProducts({ q: 'aPeX hOrIzOn' });
    assert(
      resCase.success && resCase.products.some(p => p.id === p1Id),
      '3. Search is case-insensitive ("aPeX hOrIzOn" matches "Apex Horizon")'
    );

    // --- TEST 4: Leading and trailing whitespace is handled safely ---
    const resWhitespace = await productService.searchProducts({ q: '   Wireless Earbuds   ' });
    assert(
      resWhitespace.success && resWhitespace.products.some(p => p.id === p2Id),
      '4. Search ignores leading and trailing whitespace safely'
    );

    // --- TEST 5: Search by product description where supported ---
    const resDesc = await productService.searchProducts({ q: '200MP camera' });
    assert(
      resDesc.success && resDesc.products.some(p => p.id === p1Id),
      '5. Search finds product matching unique description keywords ("200MP camera")'
    );

    // --- TEST 6: Products associated with valid businesses can be found ---
    const resBizAssociation = await productService.searchProducts({ q: 'Apex Horizon' });
    const foundP1 = resBizAssociation.products.find(p => p.id === p1Id);
    assert(
      Boolean(foundP1 && foundP1.business && foundP1.business.id === activeBizId && foundP1.business.name === activeBusiness.name),
      '6. Products retain valid relationship to public business entity'
    );

    // --- TEST 7: Products from non-public/suspended businesses are not exposed ---
    const resSuspended = await productService.searchProducts({ q: 'Secret Contraband' });
    assert(
      resSuspended.success && !resSuspended.products.some(p => p.id === p3SuspendedId),
      '7. Products from non-public or suspended businesses are strictly excluded'
    );

    // --- TEST 8: No-result search returns empty result set (not null, no fake products) ---
    const resNoResults = await productService.searchProducts({ q: 'nonexistent-quantum-widget-xyz' });
    assert(
      resNoResults.success && Array.isArray(resNoResults.products) && resNoResults.products.length === 0 && resNoResults.total === 0,
      '8. No-result search returns empty array and total=0 without fake or fallback products'
    );

    // --- TEST 9: Empty query is handled safely (rejects with 400 EMPTY_SEARCH_QUERY) ---
    let emptyQueryCaught = false;
    try {
      await productService.searchProducts({ q: '    ' });
    } catch (err: any) {
      if (err instanceof ProductServiceError && err.code === 'EMPTY_SEARCH_QUERY' && err.statusCode === 400) {
        emptyQueryCaught = true;
      }
    }
    assert(emptyQueryCaught, '9. Empty/whitespace search query is rejected with 400 and EMPTY_SEARCH_QUERY');

    // --- TEST 10: Excessively long or malformed query handled safely ---
    let longQueryCaught = false;
    const excessivelyLongQuery = 'a'.repeat(105);
    try {
      await productService.searchProducts({ q: excessivelyLongQuery });
    } catch (err: any) {
      if (err instanceof ProductServiceError && err.code === 'SEARCH_QUERY_TOO_LONG' && err.statusCode === 400) {
        longQueryCaught = true;
      }
    }
    assert(longQueryCaught, '10. Excessively long search query (>100 chars) is safely rejected with 400 and SEARCH_QUERY_TOO_LONG');

    // --- TEST 11: Sensitive/private fields are not returned in public search results ---
    const publicProfile = foundP1!;
    const keys = Object.keys(publicProfile);
    const businessKeys = publicProfile.business ? Object.keys(publicProfile.business) : [];
    const leaksSensitiveFields = 
      keys.includes('ownerId') ||
      keys.includes('password') ||
      keys.includes('passwordHash') ||
      keys.includes('token') ||
      businessKeys.includes('ownerId') ||
      businessKeys.includes('address'); // Sensitive warehouse address must be masked
    assert(
      !leaksSensitiveFields,
      '11. Sensitive/private fields (ownerId, passwordHash, unmasked address) are never exposed in public product search results'
    );

    // --- TEST 12: Pagination works correctly ---
    // Seed 15 test items for pagination verification
    const paginationBizId = `biz-pagination-${Date.now()}`;
    db.businesses.set(paginationBizId, {
      id: paginationBizId,
      name: 'Pagination Bulk Store',
      slug: 'pagination-bulk-store',
      ownerId: activeOwnerId,
      category: 'retail',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
    for (let i = 1; i <= 15; i++) {
      db.createProduct({
        id: `prod-page-item-${i}-${Date.now()}`,
        businessId: paginationBizId,
        name: `BatchItem Item Number ${i.toString().padStart(2, '0')}`,
        description: 'Pagination batch product test item',
        price: 1000 * i,
        currency: 'NGN',
        imageUrls: [],
        category: 'Test',
        inStock: true,
        createdAt: new Date(Date.now() + i * 1000).toISOString()
      });
    }

    const page1 = await productService.searchProducts({ q: 'BatchItem', page: 1, limit: 5 });
    const page2 = await productService.searchProducts({ q: 'BatchItem', page: 2, limit: 5 });
    assert(
      page1.success && 
      page1.products.length === 5 && 
      page1.page === 1 && 
      page1.totalPages === 3 && 
      page1.hasMore === true &&
      page2.products.length === 5 && 
      page2.page === 2 && 
      page1.products[0].id !== page2.products[0].id,
      '12. Pagination slices results correctly across pages with totalPages and hasMore'
    );

    // --- TEST 13: SQL-injection-style input cannot manipulate the query ---
    const sqlInjectionQueries = [
      "' OR 1=1 --",
      "'; DROP TABLE products; --",
      "\" UNION SELECT * FROM users --",
      "admin'--"
    ];
    let sqlInjPassed = true;
    for (const sq of sqlInjectionQueries) {
      const res = await productService.searchProducts({ q: sq });
      if (!res.success || !Array.isArray(res.products)) {
        sqlInjPassed = false;
      }
    }
    assert(sqlInjPassed, '13. SQL-injection-style inputs are safely sanitized and handled without syntax failure');

    // --- TEST 14: Existing business search still works ---
    const bizSearchRes = await businessService.searchBusinesses({ q: 'Apex Devices' });
    assert(
      bizSearchRes.success && bizSearchRes.businesses.some(b => b.id === activeBizId),
      '14. Existing business search (Task 3.2.1) continues to work without regression'
    );

    // --- TEST 15: Existing category/subcategory relationships still work ---
    const catSearchRes = await productService.searchProducts({ q: techCategory.name });
    assert(
      catSearchRes.success && catSearchRes.products.some(p => p.id === p1Id),
      '15. Relational category integration enables discovery via relational category taxonomy'
    );

    // --- TEST 16: Unauthorized/private product data cannot be retrieved by manipulating IDs or parameters ---
    const suspendedDirectGet = await productService.getPublicProductById(p3SuspendedId);
    assert(
      suspendedDirectGet === null,
      '16. Direct ID retrieval of products belonging to suspended/invalid businesses returns null (IDOR protection)'
    );

  } catch (err) {
    console.error('Fatal test error encountered:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TASK 3.2.2 PRODUCT SEARCH TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductSearchTests();
