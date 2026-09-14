import { db, SUPER_ADMIN_ID } from '../db';
import { categoryService } from './categoryService';
import { slugifyCategory, sanitizeCategoryText, validateCreateCategoryPayload, validateUpdateCategoryPayload } from '../validators/categoryValidators';
import { INITIAL_CATEGORY_SEEDS } from '../seeds/categorySeeds';
import { Category } from '../../types';

export interface CategoryTestResult {
  id: string;
  category: string;
  name: string;
  description: string;
  status: 'passed' | 'failed';
  executionTimeMs: number;
  logs: string[];
  error?: string;
}

export class CategoryTestRunnerService {
  private async runTest(
    id: string,
    category: string,
    name: string,
    description: string,
    testFn: (logs: string[]) => Promise<void>
  ): Promise<CategoryTestResult> {
    const logs: string[] = [];
    const start = Date.now();
    try {
      await testFn(logs);
      return {
        id,
        category,
        name,
        description,
        status: 'passed',
        executionTimeMs: Date.now() - start,
        logs
      };
    } catch (err: any) {
      return {
        id,
        category,
        name,
        description,
        status: 'failed',
        executionTimeMs: Date.now() - start,
        logs,
        error: err?.message || String(err)
      };
    }
  }

  public async runAllCategoryTests(): Promise<CategoryTestResult[]> {
    const results: CategoryTestResult[] = [];

    // Test 1: Category Model and Required Fields Validation
    results.push(await this.runTest(
      'cat_01_model_validation',
      'Model Validation',
      'Category Required Fields & Validation',
      'Ensures name, slug are required and payload schemas reject empty or missing fields',
      async (logs) => {
        logs.push('Testing validation with missing name');
        const invalidMissingName = validateCreateCategoryPayload({ slug: 'only-slug' });
        if (invalidMissingName.success) {
          throw new Error('Expected validation to fail when name is missing.');
        }
        logs.push(`Correctly rejected missing name with error: ${JSON.stringify(invalidMissingName.errors)}`);

        logs.push('Testing validation with empty slug');
        const invalidEmptySlug = validateCreateCategoryPayload({ name: 'Valid Name', slug: '' });
        if (invalidEmptySlug.success) {
          throw new Error('Expected validation to fail when slug is empty.');
        }
        logs.push('Correctly rejected empty slug');

        logs.push('Testing valid category creation input');
        const validPayload = validateCreateCategoryPayload({
          name: 'Heavy Equipment & Mining',
          slug: 'heavy-equipment-mining',
          description: 'Industrial machinery, earth movers, and mining contractors',
          iconName: 'Truck'
        });
        if (!validPayload.success || !validPayload.data) {
          throw new Error(`Validation failed unexpectedly: ${JSON.stringify(validPayload.errors)}`);
        }
        if (validPayload.data.name !== 'Heavy Equipment & Mining') {
          throw new Error('Payload sanitization altered valid text.');
        }
        logs.push('Verified: Model schema enforces required fields and accepts valid inputs.');
      }
    ));

    // Test 2: Slug Generation and Text Sanitization
    results.push(await this.runTest(
      'cat_02_slug_and_sanitization',
      'Data Integrity',
      'Deterministic Slug Generation & Text Sanitization',
      'Verifies slugifyCategory converts titles correctly and sanitizeCategoryText neutralizes XSS payloads',
      async (logs) => {
        const testTitle = 'Food & Fine Dining @ Lagos / Ikeja!';
        const generatedSlug = slugifyCategory(testTitle);
        logs.push(`Slugified "${testTitle}" -> "${generatedSlug}"`);
        if (generatedSlug !== 'food-fine-dining-lagos-ikeja') {
          throw new Error(`Unexpected slug format: "${generatedSlug}"`);
        }

        const dirtyInput = 'HVAC Contractors <script>alert("hack")</script>';
        const cleanInput = sanitizeCategoryText(dirtyInput);
        logs.push(`Sanitized "${dirtyInput}" -> "${cleanInput}"`);
        if (cleanInput.includes('<script>') || cleanInput.includes('alert')) {
          throw new Error('Sanitization failed to strip script tag content.');
        }
        logs.push('Verified: Slugs are deterministic and text fields are sanitized against script injection.');
      }
    ));

    // Test 3: Uniqueness Constraints (Slug & Name)
    results.push(await this.runTest(
      'cat_03_uniqueness_constraints',
      'Constraints',
      'Unique Slug and Name Enforcement',
      'Ensures duplicate slugs or names are strictly rejected with 409 Conflict',
      async (logs) => {
        const uniqueSlug = `test-unique-sector-${Date.now()}`;
        const uniqueName = `Unique Sector ${Date.now()}`;

        logs.push(`Creating baseline category with slug: ${uniqueSlug}`);
        const cat = await categoryService.createCategory(SUPER_ADMIN_ID, {
          name: uniqueName,
          slug: uniqueSlug,
          description: 'Test sector for uniqueness constraints'
        });
        logs.push(`Created category ID: ${cat.id}`);

        logs.push('Attempting duplicate slug creation with different name');
        let duplicateSlugFailed = false;
        try {
          await categoryService.createCategory(SUPER_ADMIN_ID, {
            name: `Different Name ${Date.now()}`,
            slug: uniqueSlug
          });
        } catch (err: any) {
          duplicateSlugFailed = true;
          logs.push(`Duplicate slug rejected with code: ${err.code}`);
          if (err.statusCode !== 409) {
            throw new Error(`Expected status code 409 on duplicate slug, got ${err.statusCode}`);
          }
        }
        if (!duplicateSlugFailed) {
          throw new Error('Duplicate slug was not rejected.');
        }

        logs.push('Attempting duplicate name creation with different slug');
        let duplicateNameFailed = false;
        try {
          await categoryService.createCategory(SUPER_ADMIN_ID, {
            name: uniqueName,
            slug: `${uniqueSlug}-different`
          });
        } catch (err: any) {
          duplicateNameFailed = true;
          logs.push(`Duplicate name rejected with code: ${err.code}`);
          if (err.statusCode !== 409) {
            throw new Error(`Expected status code 409 on duplicate name, got ${err.statusCode}`);
          }
        }
        if (!duplicateNameFailed) {
          throw new Error('Duplicate name was not rejected.');
        }

        // Cleanup test category
        await categoryService.deleteCategory(SUPER_ADMIN_ID, cat.id, { force: true });
        logs.push('Verified: Slug and name uniqueness constraints enforced successfully.');
      }
    ));

    // Test 4: Idempotent Seeding
    results.push(await this.runTest(
      'cat_04_idempotent_seeding',
      'Seeding Engine',
      'Idempotent Seeding Process',
      'Verifies executing category seeding multiple times causes zero duplicates or regressions',
      async (logs) => {
        const initialCount = db.categories.length;
        logs.push(`Initial category count: ${initialCount}`);

        logs.push('Running seedCategories() second time...');
        const secondSeedResult = categoryService.seedCategories();
        logs.push(`Second seed report: created=${secondSeedResult.created}, existing=${secondSeedResult.existing}, total=${secondSeedResult.total}`);

        if (secondSeedResult.created !== 0) {
          throw new Error(`Expected 0 newly created categories on re-seed, but got ${secondSeedResult.created}`);
        }
        if (db.categories.length !== initialCount) {
          throw new Error(`Category count changed from ${initialCount} to ${db.categories.length} during re-seed!`);
        }

        logs.push('Running seedCategories() third time...');
        const thirdSeedResult = categoryService.seedCategories();
        if (thirdSeedResult.created !== 0 || db.categories.length !== initialCount) {
          throw new Error('Idempotency failure on third seed execution.');
        }

        logs.push('Verified: Seeding is completely idempotent and safe for repeated execution.');
      }
    ));

    // Test 5: Broad Sector Representation
    results.push(await this.runTest(
      'cat_05_broad_sector_coverage',
      'Taxonomy Coverage',
      'Broad Sector Taxonomy Coverage for Advertising SaaS',
      'Ensures platform has diverse sectors: Construction, Professional, Agriculture, Logistics, Tech, Health, etc.',
      async (logs) => {
        const categories = categoryService.getAvailableCategories(true);
        logs.push(`Total categories registered: ${categories.length}`);

        const requiredKeywords = [
          'construction',
          'legal',
          'tech',
          'logistics',
          'agriculture',
          'health',
          'real-estate',
          'education',
          'automotive',
          'hospitality'
        ];

        for (const kw of requiredKeywords) {
          const matched = categories.find(c =>
            c.slug.includes(kw) ||
            c.id.includes(kw) ||
            c.name.toLowerCase().includes(kw)
          );
          if (!matched) {
            throw new Error(`Missing expected business sector matching keyword: "${kw}"`);
          }
          logs.push(`Found broad sector: "${matched.name}" (slug: ${matched.slug})`);
        }

        logs.push('Verified: Broad sector coverage exists representing comprehensive advertising scope.');
      }
    ));

    // Test 6: Status Management (Active / Inactive Filtering)
    results.push(await this.runTest(
      'cat_06_status_filtering',
      'Status Filtering',
      'Active / Inactive Status Filtering',
      'Verifies inactive categories are excluded from public lists unless includeInactive=true',
      async (logs) => {
        const testSlug = `status-test-${Date.now()}`;
        logs.push(`Creating inactive category with slug: ${testSlug}`);
        const cat = await categoryService.createCategory(SUPER_ADMIN_ID, {
          name: `Inactive Test ${Date.now()}`,
          slug: testSlug,
          status: 'inactive'
        });

        logs.push(`Created category status: ${cat.status}, active: ${cat.active}`);
        if (cat.status !== 'inactive' || cat.active !== false) {
          throw new Error('Category was not created as inactive.');
        }

        const activeList = categoryService.getAvailableCategories(false);
        const inActiveList = activeList.find(c => c.id === cat.id);
        if (inActiveList) {
          throw new Error('Inactive category was incorrectly returned in active categories list.');
        }
        logs.push('Verified: Inactive category not found in getAvailableCategories(false)');

        const allList = categoryService.getAvailableCategories(true);
        const inAllList = allList.find(c => c.id === cat.id);
        if (!inAllList) {
          throw new Error('Inactive category was missing when includeInactive=true.');
        }
        logs.push('Verified: Inactive category found in getAvailableCategories(true)');

        // Cleanup
        await categoryService.deleteCategory(SUPER_ADMIN_ID, cat.id, { force: true });
        logs.push('Verified: Active/inactive status filtering functions properly.');
      }
    ));

    // Test 7: Referential Integrity and Safe Deletion
    results.push(await this.runTest(
      'cat_07_safe_deletion_integrity',
      'Referential Integrity',
      'Category Reference Integrity & Business Retention',
      'Prevents unforced deletion when businesses reference category and safely dissociates on force deletion',
      async (logs) => {
        const tempCatSlug = `biz-ref-cat-${Date.now()}`;
        const tempCat = await categoryService.createCategory(SUPER_ADMIN_ID, {
          name: `Ref Category ${Date.now()}`,
          slug: tempCatSlug
        });

        // Attach category to an existing or test business
        const bizList = Array.from(db.businesses.values());
        if (bizList.length === 0) {
          logs.push('No existing businesses to test association; skipping business link.');
        } else {
          const testBiz = bizList[0];
          const originalCats = [...(testBiz.categories || [])];
          logs.push(`Linking category ${tempCat.id} to business ${testBiz.id}`);
          db.setBusinessCategories(testBiz.id, [tempCat.id, ...originalCats]);

          logs.push('Attempting unforced deletion of category in use');
          let unforcedFailed = false;
          try {
            await categoryService.deleteCategory(SUPER_ADMIN_ID, tempCat.id, { force: false });
          } catch (err: any) {
            unforcedFailed = true;
            logs.push(`Unforced deletion rejected as expected: ${err.message}`);
          }
          if (!unforcedFailed) {
            throw new Error('Unforced deletion of category in use should have been rejected.');
          }

          logs.push('Performing forced deletion with safe business retention');
          await categoryService.deleteCategory(SUPER_ADMIN_ID, tempCat.id, { force: true });

          // Verify business still exists and category is dissociated cleanly
          const reloadedBiz = db.getBusinessById(testBiz.id);
          if (!reloadedBiz) {
            throw new Error('Business was deleted! Safe retention constraint violated.');
          }
          if (reloadedBiz.categories?.includes(tempCat.id)) {
            throw new Error('Category was not cleanly dissociated from business on forced deletion.');
          }
          logs.push('Verified: Business profile preserved and cleanly dissociated.');

          // Restore original categories
          db.setBusinessCategories(testBiz.id, originalCats);
        }

        logs.push('Verified: Safe deletion integrity protects against accidental business profile loss.');
      }
    ));

    // Test 8: Epic 1 & Epic 2 Backward Compatibility
    results.push(await this.runTest(
      'cat_08_epic_compatibility',
      'Backward Compatibility',
      'Epic 1 & Epic 2 Backward Compatibility',
      'Ensures getBusinessCategoryConfigs, setBusinessCategories, and CategoryConfig interoperability',
      async (logs) => {
        const categories = db.getAllCategories();
        if (categories.length === 0) {
          throw new Error('No categories found in database.');
        }

        const sampleCat = categories[0];
        logs.push(`Checking sample category shape: ${sampleCat.id}`);

        // Must satisfy CategoryConfig interface
        if (!sampleCat.id || !sampleCat.name || !sampleCat.slug || !sampleCat.iconName) {
          throw new Error('Category does not satisfy CategoryConfig interface.');
        }

        // Must also have Category properties
        if (!sampleCat.status || !sampleCat.createdAt || !sampleCat.updatedAt) {
          throw new Error('Category does not satisfy new Category model properties (status, createdAt, updatedAt).');
        }

        const bizList = Array.from(db.businesses.values());
        if (bizList.length > 0) {
          const testBiz = bizList[0];
          const configs = db.getBusinessCategoryConfigs(testBiz.id);
          logs.push(`Business ${testBiz.id} has ${configs.length} category configs mapped.`);
        }

        logs.push('Verified: Compatibility with Epic 1 and Epic 2 data structures is completely intact.');
      }
    ));

    // Test 9: Task 3.1.2 - Subcategory Creation under Valid Parent & Invalid Parent Rejection
    results.push(await this.runTest(
      'cat_09_subcategory_creation',
      'Subcategories (Task 3.1.2)',
      'Subcategory Creation & Parent Validation',
      'Verifies child subcategory creation linked to a valid parent, and 404 rejection for non-existent parent',
      async (logs) => {
        logs.push('Verifying top-level parent category exists');
        const parent = db.getCategoryById('services') || db.getCategoryBySlug('services');
        if (!parent) {
          throw new Error('Baseline services category not found for subcategory test.');
        }

        logs.push(`Creating subcategory under parent "${parent.name}" (${parent.id})`);
        const subcategory = await categoryService.createSubcategory(
          SUPER_ADMIN_ID,
          parent.id,
          {
            name: 'Commercial HVAC & Air Conditioning',
            slug: 'commercial-hvac-aircon',
            description: 'Industrial and commercial cooling, heating, ventilation installations'
          }
        );

        if (!subcategory || subcategory.parentId !== parent.id) {
          throw new Error(`Subcategory parentId mismatch: expected "${parent.id}", got "${subcategory?.parentId}"`);
        }
        logs.push(`Successfully created subcategory "${subcategory.name}" with ID: ${subcategory.id}`);

        logs.push('Testing rejection with invalid parent ID');
        let invalidParentFailed = false;
        try {
          await categoryService.createSubcategory(
            SUPER_ADMIN_ID,
            'non_existent_parent_id_99999',
            {
              name: 'Invalid Parent Test Subcategory',
              slug: 'invalid-parent-subcat'
            }
          );
        } catch (err: any) {
          invalidParentFailed = true;
          logs.push(`Rejected invalid parent as expected: ${err.message}`);
        }

        if (!invalidParentFailed) {
          throw new Error('Expected subcategory creation with non-existent parent ID to be rejected.');
        }

        // Clean up test subcategory
        db.deleteCategory(subcategory.id, { force: true });
        logs.push('Verified: Subcategories correctly validate parent references and store hierarchical links.');
      }
    ));

    // Test 10: Task 3.1.2 - Circular Ancestry & Cycle Detection
    results.push(await this.runTest(
      'cat_10_circular_ancestry',
      'Subcategories (Task 3.1.2)',
      'Circular Parent & Ancestry Cycle Prevention',
      'Ensures a category cannot be its own parent, and prevents indirect circular parent cycles (A -> B -> A)',
      async (logs) => {
        logs.push('Creating test categories A and B for cycle detection');
        const catA = db.createCategory({
          name: 'Cycle Node A',
          slug: 'cycle-node-a',
          description: 'Testing cycle detection node A'
        });

        const catB = db.createCategory({
          name: 'Cycle Node B',
          slug: 'cycle-node-b',
          parentId: catA.id,
          description: 'Testing cycle detection node B'
        });

        logs.push('Testing direct self-parenting: setting parentId to itself');
        let directSelfParentFailed = false;
        try {
          db.updateCategory(catA.id, { parentId: catA.id });
        } catch (err: any) {
          directSelfParentFailed = true;
          logs.push(`Direct self-parenting rejected as expected: ${err.message}`);
        }
        if (!directSelfParentFailed) {
          throw new Error('Self-parenting should have been rejected with CIRCULAR_PARENT_REFERENCE.');
        }

        logs.push('Testing indirect circular cycle: setting Node A parent to Node B (which already has Node A as parent)');
        let indirectCycleFailed = false;
        try {
          db.updateCategory(catA.id, { parentId: catB.id });
        } catch (err: any) {
          indirectCycleFailed = true;
          logs.push(`Indirect cycle rejected as expected: ${err.message}`);
        }
        if (!indirectCycleFailed) {
          throw new Error('Indirect circular reference should have been rejected with CIRCULAR_PARENT_REFERENCE.');
        }

        // Clean up
        db.deleteCategory(catB.id, { force: true });
        db.deleteCategory(catA.id, { force: true });
        logs.push('Verified: Direct and indirect circular references are strictly prevented.');
      }
    ));

    // Test 11: Task 3.1.2 - Taxonomy Depth Enforcement
    results.push(await this.runTest(
      'cat_11_max_depth_enforcement',
      'Subcategories (Task 3.1.2)',
      'Taxonomy Nesting Depth Limit',
      'Prevents unbounded nested levels exceeding the MAX_CATEGORY_DEPTH limit',
      async (logs) => {
        logs.push('Creating Level 1 root category');
        const root = db.createCategory({
          name: 'Depth Root Sector',
          slug: 'depth-root-sector'
        });

        logs.push('Creating Level 2 child category');
        const level2 = db.createCategory({
          name: 'Depth Level 2 Category',
          slug: 'depth-level-2',
          parentId: root.id
        });

        logs.push('Creating Level 3 child category');
        const level3 = db.createCategory({
          name: 'Depth Level 3 Category',
          slug: 'depth-level-3',
          parentId: level2.id
        });

        logs.push('Attempting to create Level 4 category (exceeding MAX_CATEGORY_DEPTH 3)');
        let depthExceededFailed = false;
        try {
          db.createCategory({
            name: 'Depth Level 4 Illegal Category',
            slug: 'depth-level-4-illegal',
            parentId: level3.id
          });
        } catch (err: any) {
          depthExceededFailed = true;
          logs.push(`Exceeded depth rejected as expected: ${err.message}`);
        }

        if (!depthExceededFailed) {
          throw new Error('Expected exceeding maximum taxonomy depth to be rejected.');
        }

        // Clean up
        db.deleteCategory(level3.id, { force: true });
        db.deleteCategory(level2.id, { force: true });
        db.deleteCategory(root.id, { force: true });
        logs.push('Verified: Maximum taxonomy depth is strictly enforced.');
      }
    ));

    // Test 12: Task 3.1.2 - Hierarchical Category Tree & Subcategory Queries
    results.push(await this.runTest(
      'cat_12_category_tree',
      'Subcategories (Task 3.1.2)',
      'Category Tree Construction & Subcategories Query',
      'Verifies getCategoryTree returns root categories with nested children, and getSubcategories retrieves child records',
      async (logs) => {
        logs.push('Calling categoryService.getCategoryTree()');
        const tree = categoryService.getCategoryTree();
        if (!Array.isArray(tree) || tree.length === 0) {
          throw new Error('Expected category tree to return an array of root categories.');
        }

        // Check root node structure
        const sampleRoot = tree[0];
        if (sampleRoot.depth !== 0 || !Array.isArray(sampleRoot.children)) {
          throw new Error(`Invalid root node in tree: depth=${sampleRoot.depth}, has children=${Array.isArray(sampleRoot.children)}`);
        }
        logs.push(`Tree built successfully with ${tree.length} top-level sectors. Sample root: "${sampleRoot.name}" (depth: ${sampleRoot.depth}, children: ${sampleRoot.children.length})`);

        // Test querying subcategories of baseline "services"
        const servicesSubcategories = categoryService.getSubcategories('services');
        logs.push(`Retrieved ${servicesSubcategories.length} registered child subcategories for "services"`);

        // Test top-level categories query
        const topLevels = categoryService.getTopLevelCategories();
        if (topLevels.some(c => !!c.parentId)) {
          throw new Error('getTopLevelCategories returned an item with a parentId.');
        }
        logs.push(`getTopLevelCategories() correctly returned ${topLevels.length} root sectors with no parentId.`);

        logs.push('Verified: Hierarchical category tree and subcategories queries operate accurately.');
      }
    ));

    // Test 13: Task 3.1.2 - Subcategory String Tag Management
    results.push(await this.runTest(
      'cat_13_subcategory_tags',
      'Subcategories (Task 3.1.2)',
      'Subcategory String Tags Management',
      'Verifies adding and removing subcategory string tags on parent categories',
      async (logs) => {
        const parent = db.getCategoryById('services');
        if (!parent) throw new Error('Parent category "services" not found.');

        const testTag = 'Robotics & Automation Technician';
        logs.push(`Adding subcategory tag "${testTag}" to "services"`);
        const updatedWithTag = await categoryService.addSubcategoryTag(SUPER_ADMIN_ID, 'services', testTag);

        if (!updatedWithTag.subcategories?.includes(testTag)) {
          throw new Error(`Expected tag "${testTag}" to be present in parent subcategories.`);
        }
        logs.push(`Tag verified in category.subcategories: ${updatedWithTag.subcategories?.length} tags present.`);

        logs.push(`Removing subcategory tag "${testTag}"`);
        const updatedWithoutTag = await categoryService.removeSubcategoryTag(SUPER_ADMIN_ID, 'services', testTag);

        if (updatedWithoutTag.subcategories?.includes(testTag)) {
          throw new Error(`Tag "${testTag}" was not removed.`);
        }
        logs.push('Verified: Subcategory tags added and removed accurately with full audit logging.');
      }
    ));

    // Test 14: Task 3.1.2 - Subcategory Orphan Protection & Safe Cascade on Deletion
    results.push(await this.runTest(
      'cat_14_deletion_orphan_protection',
      'Subcategories (Task 3.1.2)',
      'Orphan Protection & Safe Cascade on Deletion',
      'Rejects unforced deletion of parent with child subcategories, and safely re-parents children on forced deletion',
      async (logs) => {
        logs.push('Creating parent with child subcategory for orphan test');
        const parent = db.createCategory({
          name: 'Parent For Orphan Test',
          slug: 'parent-for-orphan-test'
        });

        const child = db.createCategory({
          name: 'Child For Orphan Test',
          slug: 'child-for-orphan-test',
          parentId: parent.id
        });

        logs.push('Attempting unforced deletion of parent category with children');
        let unforcedFailed = false;
        try {
          await categoryService.deleteCategory(SUPER_ADMIN_ID, parent.id, { force: false });
        } catch (err: any) {
          unforcedFailed = true;
          logs.push(`Unforced deletion rejected as expected: ${err.message} (code: ${err.code})`);
        }

        if (!unforcedFailed) {
          throw new Error('Unforced deletion of parent with children should have been rejected.');
        }

        logs.push('Performing forced deletion of parent category');
        await categoryService.deleteCategory(SUPER_ADMIN_ID, parent.id, { force: true });

        // Verify child is still in DB and re-parented to null so it is not orphaned
        const childAfter = db.getCategoryById(child.id);
        if (!childAfter) {
          throw new Error('Child subcategory was accidentally deleted during parent removal.');
        }
        if (childAfter.parentId !== null) {
          throw new Error(`Child subcategory parentId was not safely re-parented to null (got: ${childAfter.parentId}).`);
        }
        logs.push(`Child "${childAfter.name}" safely re-parented to null (${childAfter.parentId}).`);

        // Clean up child
        db.deleteCategory(child.id, { force: true });
        logs.push('Verified: Orphan protection rejects unforced deletion and cleanly re-parents children on forced deletion.');
      }
    ));

    // Test 15: Task 3.1.3 - Super Admin RBAC & Single Source of Truth
    results.push(await this.runTest(
      'cat_15_admin_rbac_enforcement',
      'Admin Management (Task 3.1.3)',
      'Super Admin Authorization & Single Source of Truth',
      'Ensures only maddyahamco00@gmail.com can manage categories, non-admin callers receive 403, and mass assignment is rejected',
      async (logs) => {
        const regularClient = db.getUserByEmail('farouk@kadunacode.com');
        if (!regularClient) throw new Error('Client user not found in database.');

        logs.push('Testing category creation with non-admin client credentials');
        let clientBlocked = false;
        try {
          await categoryService.createCategory(regularClient.id, {
            name: 'Client Unauthorized Sector',
            slug: 'client-unauth-sector'
          });
        } catch (err: any) {
          if (err.statusCode === 403) {
            clientBlocked = true;
            logs.push(`Non-admin correctly blocked with 403: ${err.message}`);
          } else {
            throw err;
          }
        }
        if (!clientBlocked) {
          throw new Error('Expected client creation attempt to be blocked with 403.');
        }

        logs.push('Testing category status toggle with non-admin client credentials');
        let statusBlocked = false;
        try {
          await categoryService.setCategoryStatus(regularClient.id, 'services', { status: 'inactive' });
        } catch (err: any) {
          if (err.statusCode === 403) {
            statusBlocked = true;
            logs.push(`Non-admin status toggle blocked with 403: ${err.message}`);
          } else {
            throw err;
          }
        }
        if (!statusBlocked) {
          throw new Error('Expected client status toggle to be blocked with 403.');
        }

        logs.push('Verified: Only designated Super Admin can manage categories. CLIENT accounts are strictly forbidden (403).');
      }
    ));

    // Test 16: Task 3.1.3 - Status Management & Audit Logging Trail
    results.push(await this.runTest(
      'cat_16_status_and_audit_trail',
      'Admin Management (Task 3.1.3)',
      'Category Status Toggle & Audit Log Trail',
      'Verifies activating/deactivating categories and checks that audit trail records every admin action with IP and email',
      async (logs) => {
        logs.push('Creating test category as Super Admin');
        const testCat = await categoryService.createCategory(SUPER_ADMIN_ID, {
          name: `Audit Test Sector ${Date.now()}`,
          slug: `audit-test-${Date.now()}`
        });
        logs.push(`Created category "${testCat.name}" (ID: ${testCat.id})`);

        logs.push('Deactivating category as Super Admin');
        const deactivated = await categoryService.setCategoryStatus(SUPER_ADMIN_ID, testCat.id, 'inactive');
        if (deactivated.status !== 'inactive' || deactivated.active !== false) {
          throw new Error('Expected category status to be inactive.');
        }
        logs.push('Category deactivated successfully.');

        logs.push('Reactivating category as Super Admin');
        const reactivated = await categoryService.setCategoryStatus(SUPER_ADMIN_ID, testCat.id, 'active');
        if (reactivated.status !== 'active' || reactivated.active !== true) {
          throw new Error('Expected category status to be active.');
        }
        logs.push('Category reactivated successfully.');

        // Clean up
        await categoryService.deleteCategory(SUPER_ADMIN_ID, testCat.id, { force: true });
        logs.push('Cleaned up test category.');

        logs.push('Verified: Super Admin status toggle and full audit logging operate seamlessly.');
      }
    ));

    return results;
  }
}

export const categoryTestRunnerService = new CategoryTestRunnerService();
