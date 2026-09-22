/**
 * Business Category & Subcategory Selection Test Suite (Epic 3 Feature 3.1 Task 3.1.4)
 *
 * Verifies:
 * 1. Business creation with primary category and valid subcategory.
 * 2. Business creation with primary category and no subcategory (optional).
 * 3. Validation rejection when selected subcategory does not belong to the primary category.
 * 4. Business profile category updates (owner changing primary category and subcategory).
 * 5. Immediate subcategory validation upon category change (cannot keep invalid prior subcategory).
 * 6. Clearing/removing subcategory while preserving the primary category.
 * 7. Public profile projection contains category and subcategory details.
 * 8. Authorization protection (IDOR defense: non-owners cannot modify business category).
 * 9. Backward compatibility with Epic 1 and Epic 2 category fields and queries.
 */

import { db, SUPER_ADMIN_ID } from '../db';
import { businessService } from '../services/businessService';
import { categoryService } from '../services/categoryService';
import { SelectBusinessCategorySchema } from '../validators/businessValidators';

async function runBusinessCategorySelectionTests() {
  console.log('================================================================');
  console.log('RUNNING TASK 3.1.4: BUSINESS CATEGORY SELECTION TESTS');
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
    // Setup test users and seed categories
    categoryService.seedCategories();
    const allCategories = db.categories;
    const topLevelCategories = db.getTopLevelCategories();

    const parentCat1 = topLevelCategories[0];
    const parentCat2 = topLevelCategories[1] || topLevelCategories[0];

    // Find or create a valid subcategory for parentCat1
    let subcategory1 = allCategories.find(c => c.parentId === parentCat1.id);
    if (!subcategory1) {
      subcategory1 = await categoryService.createSubcategory(SUPER_ADMIN_ID, parentCat1.id, {
        name: `${parentCat1.name} Subspecialty`,
        slug: `${parentCat1.slug}-subspecialty`
      });
    }

    const testOwnerId = `test-merchant-${Date.now()}`;
    const attackerId = `test-attacker-${Date.now()}`;

    db.users.set(testOwnerId, {
      id: testOwnerId,
      email: `merchant_${Date.now()}@example.com`,
      name: 'Test Merchant',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'pro',
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0
    });

    db.users.set(attackerId, {
      id: attackerId,
      email: `attacker_${Date.now()}@example.com`,
      name: 'Attacker User',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'free',
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0
    });

    // ----------------------------------------------------
    // TEST SUITE 1: Validation Schema Tests
    // ----------------------------------------------------
    console.log('\n--- 1. Validation Schema (SelectBusinessCategorySchema) ---');

    const validSchemaResult = SelectBusinessCategorySchema.safeParse({
      categoryId: parentCat1.id,
      subcategoryId: subcategory1.id
    });
    assert(validSchemaResult.success, 'SelectBusinessCategorySchema accepts valid categoryId and subcategoryId');

    const validNoSubResult = SelectBusinessCategorySchema.safeParse({
      categoryId: parentCat1.id,
      subcategoryId: null
    });
    assert(validNoSubResult.success, 'SelectBusinessCategorySchema accepts null subcategoryId');

    const invalidEmptyCategoryResult = SelectBusinessCategorySchema.safeParse({
      categoryId: '',
      subcategoryId: null
    });
    assert(!invalidEmptyCategoryResult.success, 'SelectBusinessCategorySchema rejects empty categoryId');

    // ----------------------------------------------------
    // TEST SUITE 2: Business Creation with Category Selection
    // ----------------------------------------------------
    console.log('\n--- 2. Business Creation with Category & Subcategory ---');

    // 2.1 Valid creation with Category and Subcategory
    const createRes1 = await businessService.createBusiness(testOwnerId, {
      name: `Bakery Delight ${Date.now()}`,
      description: 'Artisanal sourdough and pastries made daily.',
      categoryId: parentCat1.id,
      subcategoryId: subcategory1.id
    });
    const createdBiz1 = createRes1.business;

    assert(createdBiz1.id !== undefined, 'Business successfully created');
    assert(createdBiz1.categoryId === parentCat1.id, 'Business has correct primary categoryId assigned');
    assert(createdBiz1.subcategoryId === subcategory1.id, 'Business has correct subcategoryId assigned');
    assert(createdBiz1.subcategoryName === subcategory1.name, 'Business stores subcategoryName projection');
    assert(createdBiz1.category === parentCat1.id || createdBiz1.categoryLabel === parentCat1.name, 'Business backward compatible category string populated');

    // 2.2 Rejection when subcategory does not belong to the chosen category
    let rejectedMismatch = false;
    try {
      await businessService.createBusiness(testOwnerId, {
        name: `Mismatched Biz ${Date.now()}`,
        description: 'Test business with invalid taxonomy.',
        categoryId: parentCat2.id, // Parent 2
        subcategoryId: subcategory1.id // Belongs to Parent 1!
      });
    } catch (err: any) {
      rejectedMismatch = true;
      assert(err.message.includes('does not belong to'), 'Rejects mismatched subcategory with clear error message');
    }
    assert(rejectedMismatch, 'Strict taxonomy enforcement prevents mismatched subcategory on creation');

    // ----------------------------------------------------
    // TEST SUITE 3: Business Profile Category Updates
    // ----------------------------------------------------
    console.log('\n--- 3. Business Profile Category & Subcategory Updates ---');

    // 3.1 Update category selection to new valid subcategory
    const updateRes1 = await businessService.updateBusinessCategories(
      testOwnerId,
      createdBiz1.id,
      {
        categoryId: parentCat1.id,
        subcategoryId: subcategory1.name // testing tag or name matching
      }
    );
    const updatedBiz1 = updateRes1.business;
    assert(updatedBiz1.subcategoryId === subcategory1.id, 'Category update accepts subcategory name and resolves ID');

    // 3.2 Clear subcategory (set to null)
    const clearRes = await businessService.updateBusinessCategories(
      testOwnerId,
      createdBiz1.id,
      {
        categoryId: parentCat1.id,
        subcategoryId: null
      }
    );
    const clearedSubBiz = clearRes.business;
    assert(!clearedSubBiz.subcategoryId, 'Clearing subcategory clears subcategoryId');
    assert(!clearedSubBiz.subcategoryName, 'Clearing subcategory clears subcategoryName');
    assert(clearedSubBiz.categoryId === parentCat1.id, 'Primary category is preserved when subcategory is cleared');

    // 3.3 Changing Category with an invalid old Subcategory triggers rejection
    let rejectedInvalidChange = false;
    try {
      await businessService.updateBusinessCategories(
        testOwnerId,
        createdBiz1.id,
        {
          categoryId: parentCat2.id,
          subcategoryId: subcategory1.id // Belongs to parentCat1!
        }
      );
    } catch (err: any) {
      rejectedInvalidChange = true;
    }
    assert(rejectedInvalidChange, 'Cannot assign a subcategory from a previous category when changing category');

    // ----------------------------------------------------
    // TEST SUITE 4: Public Profile Projection
    // ----------------------------------------------------
    console.log('\n--- 4. Public Profile Projection Integrity ---');

    // Re-assign valid subcategory
    await businessService.updateBusinessCategories(
      testOwnerId,
      createdBiz1.id,
      {
        categoryId: parentCat1.id,
        subcategoryId: subcategory1.id
      }
    );

    const publicProfileRes = await businessService.getPublicBusinessProfile(createdBiz1.id);
    const publicProfile = publicProfileRes.business;
    assert(publicProfile !== null, 'Public business profile is accessible');
    assert(publicProfile?.categoryId === parentCat1.id, 'Public profile includes categoryId');
    assert(publicProfile?.subcategoryId === subcategory1.id, 'Public profile includes subcategoryId');
    assert(publicProfile?.subcategoryName === subcategory1.name, 'Public profile includes subcategoryName');

    // ----------------------------------------------------
    // TEST SUITE 5: Security & Authorization (IDOR Defense)
    // ----------------------------------------------------
    console.log('\n--- 5. Security & IDOR Authorization ---');

    let unauthorizedRejected = false;
    try {
      await businessService.updateBusinessCategories(
        attackerId, // Not the owner
        createdBiz1.id,
        {
          categoryId: parentCat1.id,
          subcategoryId: null
        }
      );
    } catch (err: any) {
      unauthorizedRejected = true;
      assert(err.message.includes('Unauthorized') || err.message.includes('not authorized') || err.code === 'FORBIDDEN', 'Rejects unauthorized user attempt to update business category');
    }
    assert(unauthorizedRejected, 'IDOR protection prevents non-owners from updating categories');

  } catch (error) {
    console.error('Unexpected error in business category selection tests:', error);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBusinessCategorySelectionTests();
