import { db, isDesignatedSuperAdminEmail } from '../db';
import { categoryService, CategoryServiceError } from '../services/categoryService';
import { auditService } from '../services/auditService';
import { 
  validateCreateCategoryPayload, 
  validateUpdateCategoryPayload,
  validateUpdateCategoryStatusPayload,
  validateNoCategoryMassAssignment
} from '../validators/categoryValidators';

/**
 * Task 3.1.3: Admin Category Management Comprehensive Test Suite
 */
async function runAdminCategoryManagementTests() {
  console.log('================================================================');
  console.log('RUNNING TASK 3.1.3: ADMIN CATEGORY MANAGEMENT VERIFICATION TESTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (failureDetails) console.error(`       Details: ${failureDetails}`);
      failed++;
    }
  }

  // Ensure baseline database state
  db.seedCategories();
  const superAdmin = db.getUserByEmail('maddyahamco00@gmail.com')!;
  const regularClient = db.getUserByEmail('farouk@kadunacode.com')!;

  console.log('\n--- 1. Super Admin Authorization & RBAC Checks ---');
  
  // Test 1: Designated Super Admin email verification
  assert(
    isDesignatedSuperAdminEmail('maddyahamco00@gmail.com') === true,
    'Designated Super Admin email is strictly recognized'
  );

  // Test 2: Other emails are rejected from Super Admin status
  assert(
    isDesignatedSuperAdminEmail('admin2@example.com') === false &&
    isDesignatedSuperAdminEmail('client@boostmarket.com') === false &&
    isDesignatedSuperAdminEmail('maddyahamco00@gmail.com.fake') === false,
    'Secondary or fraudulent admin emails are strictly rejected'
  );

  // Test 3: Non-admin caller receives 403 when creating category
  try {
    await categoryService.createCategory(regularClient.id, {
      name: 'Hacker Category',
      slug: 'hacker-cat'
    });
    assert(false, 'Regular client was erroneously allowed to create category');
  } catch (err: any) {
    assert(
      err instanceof CategoryServiceError && err.statusCode === 403,
      'Regular client is strictly forbidden (403) from creating category'
    );
  }

  // Test 4: Non-admin caller receives 403 when updating category
  try {
    await categoryService.updateCategory(regularClient.id, 'services', {
      name: 'Hacked Services'
    });
    assert(false, 'Regular client was erroneously allowed to update category');
  } catch (err: any) {
    assert(
      err instanceof CategoryServiceError && err.statusCode === 403,
      'Regular client is strictly forbidden (403) from updating category'
    );
  }

  // Test 5: Non-admin caller receives 403 when deleting category
  try {
    await categoryService.deleteCategory(regularClient.id, 'services');
    assert(false, 'Regular client was erroneously allowed to delete category');
  } catch (err: any) {
    assert(
      err instanceof CategoryServiceError && err.statusCode === 403,
      'Regular client is strictly forbidden (403) from deleting category'
    );
  }

  console.log('\n--- 2. Category Creation & Mass-Assignment Protection ---');

  // Test 6: Mass assignment prevention rejects role/isSuperAdmin injection
  const massAssignmentCheck = validateNoCategoryMassAssignment({
    name: 'Tech Ventures',
    role: 'super_admin',
    isSuperAdmin: true
  });
  assert(
    massAssignmentCheck.allowed === false && massAssignmentCheck.forbiddenField === 'role',
    'Mass-assignment validation rejects role injection'
  );

  // Test 7: Super Admin successfully creates a new top-level category
  const testCatSlug = `test-biotech-${Date.now()}`;
  const newCat = await categoryService.createCategory(superAdmin.id, {
    name: `Biotech & Life Sciences ${Date.now()}`,
    slug: testCatSlug,
    description: 'Biotechnology research, pharmaceuticals, and genomic development.',
    iconName: 'Dna',
    bannerImage: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800'
  });
  assert(
    newCat && newCat.id && newCat.slug === testCatSlug && newCat.status === 'active',
    'Super Admin creates top-level category with valid attributes'
  );

  console.log('\n--- 3. Category Update & Status Management ---');

  // Test 8: Super Admin updates category name and description
  const updatedCat = await categoryService.updateCategory(superAdmin.id, newCat.id, {
    name: `${newCat.name} (Updated)`,
    description: 'Expanded biotechnology and precision medicine directory.'
  });
  assert(
    updatedCat.name.includes('(Updated)') && updatedCat.description.includes('precision medicine'),
    'Super Admin updates category metadata successfully'
  );

  // Test 9: Super Admin deactivates category (status: inactive)
  const deactivatedCat = await categoryService.setCategoryStatus(superAdmin.id, newCat.id, {
    status: 'inactive'
  });
  assert(
    deactivatedCat.status === 'inactive' && deactivatedCat.active === false,
    'Super Admin deactivates category (status: inactive, active: false)'
  );

  // Test 10: Inactive category is excluded from default public list
  const activeOnly = categoryService.getAvailableCategories(false);
  assert(
    !activeOnly.some(c => c.id === newCat.id),
    'Deactivated category is excluded from standard public queries'
  );

  // Test 11: Inactive category is included when includeInactive=true
  const allWithInactive = categoryService.getAvailableCategories(true);
  assert(
    allWithInactive.some(c => c.id === newCat.id),
    'Deactivated category is present in admin query when includeInactive=true'
  );

  // Test 12: Super Admin reactivates category
  const reactivatedCat = await categoryService.setCategoryStatus(superAdmin.id, newCat.id, {
    status: 'active'
  });
  assert(
    reactivatedCat.status === 'active' && reactivatedCat.active === true,
    'Super Admin reactivates category'
  );

  console.log('\n--- 4. Subcategory Management Under Parent ---');

  // Test 13: Super Admin creates subcategory under parent
  const subcatSlug = `genomics-${Date.now()}`;
  const subcat = await categoryService.createSubcategory(superAdmin.id, newCat.id, {
    name: 'Genomic Sequencing',
    slug: subcatSlug,
    description: 'Next-generation DNA sequencing and bioinformatics services.',
    iconName: 'Microscope'
  });
  assert(
    subcat && subcat.parentId === newCat.id && subcat.slug === subcatSlug,
    'Super Admin creates subcategory linked to parent category'
  );

  // Test 14: Super Admin updates subcategory under parent
  const updatedSubcat = await categoryService.updateSubcategory(superAdmin.id, newCat.id, subcat.id, {
    description: 'Advanced genomics, CRISPR tools, and bioinformatics platforms.'
  });
  assert(
    updatedSubcat.description.includes('CRISPR tools'),
    'Super Admin updates subcategory under parent'
  );

  // Test 15: Subcategory list under parent reflects created subcategory
  const subcatsList = categoryService.getSubcategories(newCat.id, true);
  assert(
    subcatsList.some(sc => sc.id === subcat.id),
    'Parent category returns linked subcategories'
  );

  console.log('\n--- 5. Referential Integrity & Safe Deletion ---');

  // Test 16: Attempting to delete parent with existing child fails safely (400)
  try {
    await categoryService.deleteCategory(superAdmin.id, newCat.id, { force: false });
    assert(false, 'Category with child subcategories was erroneously deleted');
  } catch (err: any) {
    assert(
      err instanceof CategoryServiceError && err.code === 'CATEGORY_HAS_CHILDREN',
      'Deletion rejected when category has child subcategories (safe retention)'
    );
  }

  // Test 17: Assign category to a business and verify delete protection
  const testBiz = Array.from(db.businesses.values())[0];
  const originalBizCategories = [...(testBiz.categories || [])];
  testBiz.categories = [...originalBizCategories, newCat.id as any];
  db.businesses.set(testBiz.id, testBiz);

  // Delete subcategory first
  await categoryService.deleteSubcategory(superAdmin.id, newCat.id, subcat.id);

  // Now attempt to delete category assigned to testBiz without force
  try {
    await categoryService.deleteCategory(superAdmin.id, newCat.id, { force: false });
    assert(false, 'In-use category was deleted without force option');
  } catch (err: any) {
    assert(
      err instanceof CategoryServiceError && err.code === 'CATEGORY_IN_USE',
      'Deletion rejected with CATEGORY_IN_USE when assigned to businesses'
    );
  }

  // Test 18: Safe dissociation with force: true preserves business entity
  const deleteResult = await categoryService.deleteCategory(superAdmin.id, newCat.id, { force: true });
  assert(
    deleteResult.success === true,
    'Forced deletion succeeds with safe dissociation'
  );

  // Verify business still exists and category is dissociated
  const bizAfterDelete = db.getBusinessById(testBiz.id);
  assert(
    bizAfterDelete !== undefined && !bizAfterDelete.categories?.includes(newCat.id as any),
    'Business profile is preserved and category reference is cleanly dissociated'
  );

  // Restore test business categories
  testBiz.categories = originalBizCategories;
  db.businesses.set(testBiz.id, testBiz);

  console.log('\n--- 6. Audit Logging Verification ---');

  // Test 19: Verify audit events were generated for admin actions
  const auditLogs = auditService.getRecentLogs(100);
  const categoryActions = auditLogs.filter(log => log.category === 'CATEGORY');
  assert(
    categoryActions.length >= 5,
    `Audit trail captures all admin category events (found ${categoryActions.length} category events)`
  );

  const hasCreatedLog = categoryActions.some(log => (log.details as any)?.action === 'CATEGORY_CREATED');
  const hasUpdatedLog = categoryActions.some(log => (log.details as any)?.action === 'CATEGORY_UPDATED');
  const hasStatusLog = categoryActions.some(log => ['CATEGORY_ACTIVATED', 'CATEGORY_DEACTIVATED'].includes((log.details as any)?.action));
  const hasDeletedLog = categoryActions.some(log => (log.details as any)?.action === 'CATEGORY_DELETED');

  assert(
    hasCreatedLog && hasUpdatedLog && hasStatusLog && hasDeletedLog,
    'Audit logs record specific actions: CREATED, UPDATED, ACTIVATED/DEACTIVATED, and DELETED'
  );

  console.log('================================================================');
  console.log(`TASK 3.1.3 SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminCategoryManagementTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
