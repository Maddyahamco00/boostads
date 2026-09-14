/**
 * Comprehensive Category Database Integration & Integrity Test Suite (Epic 3 Feature 3.1 Task 3.1.1)
 *
 * Verifies:
 * 1. Category model creation, normalization, and validation rules.
 * 2. Deterministic slug generation & text sanitization.
 * 3. Uniqueness constraints for slugs and names (case-insensitive).
 * 4. Idempotent seeding behavior (repeated executions yield no duplicates).
 * 5. Broad sector taxonomy coverage representing SaaS advertising.
 * 6. Active vs Inactive status filtering.
 * 7. Referential integrity and safe retention (no orphan businesses, prevent accidental loss).
 * 8. Backward compatibility with Epic 1 and Epic 2 data structures and methods.
 */

import { db, SUPER_ADMIN_ID } from '../db';
import { categoryService } from '../services/categoryService';
import { categoryTestRunnerService } from '../services/categoryTestRunnerService';
import { slugifyCategory, sanitizeCategoryText, validateCreateCategoryPayload, validateUpdateCategoryPayload } from '../validators/categoryValidators';

async function runCategoryDatabaseTests() {
  console.log('================================================================');
  console.log('RUNNING TASK 3.1.1: CATEGORY DATABASE & TAXONOMY FOUNDATION TESTS');
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
    // ----------------------------------------------------
    // TEST SUITE 1: Validation & Sanitization
    // ----------------------------------------------------
    console.log('\n--- 1. Validation & Sanitization Tests ---');

    // 1.1 Missing name validation
    const missingNameResult = validateCreateCategoryPayload({ slug: 'test-slug' });
    assert(!missingNameResult.success, 'Rejects payload when name is missing');

    // 1.2 Empty slug validation
    const emptySlugResult = validateCreateCategoryPayload({ name: 'Valid Sector', slug: '' });
    assert(!emptySlugResult.success, 'Rejects payload when slug is empty');

    // 1.3 Automatic slugification if slug omitted
    const autoSlugResult = validateCreateCategoryPayload({ name: 'Civil Engineering & Contractors' });
    assert(autoSlugResult.success && autoSlugResult.data?.slug === 'civil-engineering-contractors', 'Auto-generates valid slug when slug is omitted');

    // 1.4 Text sanitization against XSS
    const dirtyTitle = 'Industrial Equipment <script>alert("xss")</script>';
    const sanitized = sanitizeCategoryText(dirtyTitle);
    assert(!sanitized.includes('<script>') && !sanitized.includes('alert'), 'Strips executable script tags from category titles');

    // 1.5 Deterministic slugification
    const generatedSlug = slugifyCategory('Oil, Gas & Energy Exploration');
    assert(generatedSlug === 'oil-gas-energy-exploration', 'Deterministic slug generation converts symbols and spaces to clean hyphens');

    // ----------------------------------------------------
    // TEST SUITE 2: Uniqueness Constraints
    // ----------------------------------------------------
    console.log('\n--- 2. Uniqueness Constraint Tests ---');

    const testSlug = `unique-test-sector-${Date.now()}`;
    const testName = `Unique Test Sector ${Date.now()}`;

    const createdCategory = await categoryService.createCategory(SUPER_ADMIN_ID, {
      name: testName,
      slug: testSlug,
      description: 'Sector to test uniqueness checks'
    });
    assert(!!createdCategory.id && createdCategory.slug === testSlug, 'Super Admin successfully creates category with valid parameters');

    // Duplicate slug rejection
    let duplicateSlugRejected = false;
    try {
      await categoryService.createCategory(SUPER_ADMIN_ID, {
        name: `Different Sector Name ${Date.now()}`,
        slug: testSlug.toUpperCase() // Case-insensitive check
      });
    } catch (err: any) {
      duplicateSlugRejected = err.statusCode === 409;
    }
    assert(duplicateSlugRejected, 'Rejects duplicate slug with 409 Conflict (case-insensitive)');

    // Duplicate name rejection
    let duplicateNameRejected = false;
    try {
      await categoryService.createCategory(SUPER_ADMIN_ID, {
        name: testName.toLowerCase(), // Case-insensitive check
        slug: `${testSlug}-diff`
      });
    } catch (err: any) {
      duplicateNameRejected = err.statusCode === 409;
    }
    assert(duplicateNameRejected, 'Rejects duplicate name with 409 Conflict (case-insensitive)');

    // ----------------------------------------------------
    // TEST SUITE 3: Idempotent Seeding
    // ----------------------------------------------------
    console.log('\n--- 3. Idempotent Seeding Tests ---');

    const countBefore = db.categories.length;
    const reseedResult1 = categoryService.seedCategories();
    assert(reseedResult1.created === 0, 'Re-seeding existing database creates 0 duplicate categories');
    assert(db.categories.length === countBefore, 'Re-seeding preserves exact category count');

    const reseedResult2 = categoryService.seedCategories();
    assert(reseedResult2.created === 0 && db.categories.length === countBefore, 'Successive re-seeding runs are strictly idempotent');

    // ----------------------------------------------------
    // TEST SUITE 4: Broad Sector Taxonomy Coverage
    // ----------------------------------------------------
    console.log('\n--- 4. Broad Sector Taxonomy Coverage Tests ---');

    const allCategories = categoryService.getAvailableCategories(true);
    assert(allCategories.length >= 25, `Taxonomy contains at least 25 broad business categories (found ${allCategories.length})`);

    const sectorsToCheck = [
      'construction',
      'legal',
      'tech',
      'logistics',
      'agriculture',
      'health',
      'real-estate',
      'education',
      'automotive',
      'food'
    ];

    let foundAllSectors = true;
    for (const sector of sectorsToCheck) {
      const match = allCategories.find(c => c.slug.includes(sector) || c.id.includes(sector));
      if (!match) {
        foundAllSectors = false;
        console.error(`Missing expected sector: ${sector}`);
      }
    }
    assert(foundAllSectors, 'Comprehensive coverage across construction, legal, tech, logistics, agriculture, health, and more');

    // ----------------------------------------------------
    // TEST SUITE 5: Status Management & Active Filtering
    // ----------------------------------------------------
    console.log('\n--- 5. Status Management & Active Filtering Tests ---');

    const inactiveSlug = `inactive-sector-${Date.now()}`;
    const inactiveCat = await categoryService.createCategory(SUPER_ADMIN_ID, {
      name: `Inactive Sector ${Date.now()}`,
      slug: inactiveSlug,
      status: 'inactive'
    });

    const activeList = categoryService.getAvailableCategories(false);
    assert(!activeList.some(c => c.id === inactiveCat.id), 'Inactive category is omitted from standard public listing');

    const fullList = categoryService.getAvailableCategories(true);
    assert(fullList.some(c => c.id === inactiveCat.id), 'Inactive category is included when includeInactive=true');

    // Activate category via update
    const activatedCat = await categoryService.updateCategory(SUPER_ADMIN_ID, inactiveCat.id, {
      status: 'active'
    });
    assert(activatedCat.status === 'active' && activatedCat.active === true, 'Category status toggles from inactive to active');

    // ----------------------------------------------------
    // TEST SUITE 6: Referential Integrity & Safe Deletion
    // ----------------------------------------------------
    console.log('\n--- 6. Referential Integrity & Safe Deletion Tests ---');

    const refCatSlug = `ref-protection-${Date.now()}`;
    const refCat = await categoryService.createCategory(SUPER_ADMIN_ID, {
      name: `Ref Protection ${Date.now()}`,
      slug: refCatSlug
    });

    // Create a mock business to reference this category
    const testBizId = `biz_ref_test_${Date.now()}`;
    const testBiz = {
      id: testBizId,
      ownerId: 'usr_test_owner',
      name: 'Integrity Test Business Ltd',
      slug: `integrity-test-biz-${Date.now()}`,
      categories: [refCat.id],
      category: refCat.id as any,
      categoryLabel: refCat.name,
      subcategories: [],
      location: { city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
      contact: { email: 'biz@test.com' },
      isVerified: false,
      tier: 'free' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.businesses.set(testBiz.id, testBiz as any);
    db.setBusinessCategories(testBiz.id, [refCat.id]);

    // Attempt unforced deletion
    let unforcedRejected = false;
    try {
      await categoryService.deleteCategory(SUPER_ADMIN_ID, refCat.id, { force: false });
    } catch (err: any) {
      unforcedRejected = err.code === 'CATEGORY_IN_USE';
    }
    assert(unforcedRejected, 'Prevents accidental unforced deletion of category assigned to businesses');

    // Forced deletion safely dissociates without deleting business entity
    await categoryService.deleteCategory(SUPER_ADMIN_ID, refCat.id, { force: true });
    const preservedBiz = db.getBusinessById(testBizId);
    assert(!!preservedBiz, 'Business entity is preserved during forced category deletion (safe retention)');
    assert(!preservedBiz?.categories?.includes(refCat.id), 'Category reference is cleanly dissociated from business');

    // Clean up test entities
    db.businesses.delete(testBizId);
    await categoryService.deleteCategory(SUPER_ADMIN_ID, createdCategory.id, { force: true });
    await categoryService.deleteCategory(SUPER_ADMIN_ID, inactiveCat.id, { force: true });

    // ----------------------------------------------------
    // TEST SUITE 7: Epic 1 & Epic 2 Backward Compatibility
    // ----------------------------------------------------
    console.log('\n--- 7. Epic 1 & Epic 2 Backward Compatibility Tests ---');

    const sampleCategory = db.getCategoryById('services');
    assert(!!sampleCategory, 'Found baseline "services" category by ID');
    assert(sampleCategory?.slug === 'services', 'Baseline "services" category has correct slug');

    // CategoryConfig compatibility
    assert(
      typeof sampleCategory?.id === 'string' &&
      typeof sampleCategory?.name === 'string' &&
      typeof sampleCategory?.slug === 'string' &&
      typeof sampleCategory?.iconName === 'string',
      'Category implements full CategoryConfig interface seamlessly'
    );

    // Business-category relations methods
    const allConfigs = db.getAllCategories();
    assert(Array.isArray(allConfigs) && allConfigs.length > 0, 'db.getAllCategories() returns category collection');

    // ----------------------------------------------------
    // TEST SUITE 8: Task 3.1.2 Subcategory & Hierarchy Invariants
    // ----------------------------------------------------
    console.log('\n--- 8. Task 3.1.2 Subcategory & Hierarchy Direct Tests ---');

    // 8.1 Create child subcategory under top-level parent
    const subcat = await categoryService.createSubcategory(SUPER_ADMIN_ID, 'services', {
      name: 'Architectural Glazing & Glass Works',
      slug: 'architectural-glazing-glass',
      description: 'Custom structural glass, curtain walls, storefronts'
    });
    assert(!!subcat && subcat.parentId === 'services', 'Creates subcategory linked to valid parent');

    // 8.2 Reject invalid parent ID
    let badParentErr = false;
    try {
      await categoryService.createSubcategory(SUPER_ADMIN_ID, 'ghost_parent_12345', {
        name: 'Ghost Subcat',
        slug: 'ghost-subcat'
      });
    } catch {
      badParentErr = true;
    }
    assert(badParentErr, 'Rejects subcategory creation with non-existent parent ID (404)');

    // 8.3 Reject circular reference
    let circularErr = false;
    try {
      db.updateCategory(subcat.id, { parentId: subcat.id });
    } catch {
      circularErr = true;
    }
    assert(circularErr, 'Rejects direct self-parenting circular reference (400)');

    // 8.4 Category tree construction
    const tree = categoryService.getCategoryTree();
    assert(Array.isArray(tree) && tree.length > 0, 'Category tree returns array of top-level sectors');
    const servicesNode = tree.find(n => n.id === 'services');
    assert(servicesNode !== undefined && Array.isArray(servicesNode.children), 'Tree contains parent with children array');

    // 8.5 Subcategory tags
    const tagged = await categoryService.addSubcategoryTag(SUPER_ADMIN_ID, 'services', 'Custom Glazier');
    assert(tagged.subcategories?.includes('Custom Glazier') === true, 'Adds subcategory string tag');
    const untagged = await categoryService.removeSubcategoryTag(SUPER_ADMIN_ID, 'services', 'Custom Glazier');
    assert(untagged.subcategories?.includes('Custom Glazier') === false, 'Removes subcategory string tag');

    // Clean up test subcategory
    db.deleteCategory(subcat.id, { force: true });

    // ----------------------------------------------------
    // TEST SUITE 9: Automated Category Test Runner Service
    // ----------------------------------------------------
    console.log('\n--- 9. CategoryTestRunnerService Integration Tests ---');
    const runnerResults = await categoryTestRunnerService.runAllCategoryTests();
    const allPassed = runnerResults.every(r => r.status === 'passed');
    assert(allPassed, `CategoryTestRunnerService executed ${runnerResults.length} test scenarios, all passed`);

  } catch (err: any) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCategoryDatabaseTests();
