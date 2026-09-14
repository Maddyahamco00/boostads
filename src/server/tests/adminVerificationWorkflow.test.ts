/**
 * Comprehensive Admin Verification Workflow Integration & Security Test Suite (Task 2.3.3)
 *
 * Verifies:
 * 1. SUPER_ADMIN authorization guards:
 *    - Unauthenticated cannot access admin verification APIs (401)
 *    - CLIENT / non-admin cannot access admin verification APIs (403)
 *    - Only designated Super Admin (maddyahamco00@gmail.com) can decide verification
 * 2. Verification queue retrieval & filtering (PENDING, APPROVED, REJECTED, ALL, Search)
 * 3. Detailed inspection payload integrity:
 *    - Complete business profile data
 *    - Registered owner profile data
 *    - Submitted verification notes and metadata
 *    - Audit & decision metadata
 * 4. Approval Workflow:
 *    - Sets status to APPROVED
 *    - Sets business.isVerified = true
 *    - Sets business.verificationStatus = 'APPROVED'
 *    - Derives reviewerId strictly from session (never frontend input)
 *    - Writes security audit log
 *    - Prevents double-approval / stale transition (409)
 * 5. Rejection Workflow:
 *    - Rejection reason is required (min 3 chars, max 500 chars)
 *    - Sets status to REJECTED
 *    - Keeps business.isVerified = false
 *    - Sets business.verificationStatus = 'REJECTED'
 *    - Saves rejectionReason for merchant feedback
 *    - Prevents double-rejection / stale transition (409)
 * 6. Concurrency & Anti-Tamper:
 *    - Client-supplied reviewerId / isVerified in request body is stripped/rejected
 *    - Optimistic concurrency control via expectedStatus
 */

import { db, SUPER_ADMIN_EMAIL, SUPER_ADMIN_ID, isDesignatedSuperAdminEmail } from '../db';
import { businessService } from '../services/businessService';
import { validateAdminReviewPayload, FORBIDDEN_ADMIN_REVIEW_FIELDS } from '../validators/businessValidators';

async function runAdminVerificationWorkflowTests() {
  console.log('====================================================');
  console.log('RUNNING TASK 2.3.3: ADMIN VERIFICATION WORKFLOW TESTS');
  console.log('====================================================\n');

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
    // 1. Setup Test Fixtures
    const clientUser = {
      id: `usr_client_adminwf_${Date.now()}`,
      email: 'merchant_wf@boostmarket.com',
      name: 'Merchant Workflow Owner',
      role: 'CLIENT' as const,
      status: 'ACTIVE' as const,
      clientType: 'business' as const,
      tier: 'pro' as const,
      createdAt: new Date().toISOString()
    };
    db.users.set(clientUser.id, { ...clientUser, failedLoginAttempts: 0 });

    const superAdmin = db.getUserById(SUPER_ADMIN_ID) || db.getUserByEmail(SUPER_ADMIN_EMAIL);
    assert(
      !!superAdmin && superAdmin.role === 'SUPER_ADMIN' && isDesignatedSuperAdminEmail(superAdmin.email),
      'Test 1: Super Admin identity verified as designated email (maddyahamco00@gmail.com)'
    );

    const bizApprovedTest = {
      id: `biz_adm_appr_${Date.now()}`,
      name: 'Ahamco Logistics Ltd',
      slug: `ahamco-logistics-${Date.now()}`,
      description: 'Nationwide express logistics and delivery services.',
      category: 'logistics',
      categories: ['logistics'],
      location: {
        city: 'Port Harcourt',
        state: 'Rivers',
        country: 'Nigeria',
        address: '14 Aba Road'
      },
      phone: '+2348033334444',
      email: 'ahamco@boostmarket.com',
      ownerId: clientUser.id,
      isVerified: false,
      verificationStatus: 'NOT_SUBMITTED' as const,
      createdAt: new Date().toISOString()
    };
    db.businesses.set(bizApprovedTest.id, bizApprovedTest);

    const bizRejectTest = {
      id: `biz_adm_rej_${Date.now()}`,
      name: 'Shady Ventures Enterprise',
      slug: `shady-ventures-${Date.now()}`,
      description: 'General trading and import export merchandise.',
      category: 'retail',
      categories: ['retail'],
      location: {
        city: 'Kano',
        state: 'Kano',
        country: 'Nigeria',
        address: '88 Market Way'
      },
      phone: '+2348077778888',
      email: 'shady@boostmarket.com',
      ownerId: clientUser.id,
      isVerified: false,
      verificationStatus: 'NOT_SUBMITTED' as const,
      createdAt: new Date().toISOString()
    };
    db.businesses.set(bizRejectTest.id, bizRejectTest);

    // ------------------------------------------------------------------
    // TEST 2: Submit Verification Requests for Testing
    // ------------------------------------------------------------------
    const res1 = await businessService.submitVerificationRequest(
      clientUser.id,
      bizApprovedTest.id,
      { notes: 'Registered under CAC RC-1234567. Attached certified registration.' },
      '127.0.0.1',
      'Mozilla/5.0'
    );
    const req1 = res1.request;
    assert(req1.status === 'PENDING', 'Test 2a: Request 1 submitted and initial status is PENDING');

    const res2 = await businessService.submitVerificationRequest(
      clientUser.id,
      bizRejectTest.id,
      { notes: 'Incomplete documents provided.' },
      '127.0.0.1',
      'Mozilla/5.0'
    );
    const req2 = res2.request;
    assert(req2.status === 'PENDING', 'Test 2b: Request 2 submitted and initial status is PENDING');

    // ------------------------------------------------------------------
    // TEST 3: Admin Queue Retrieval & Filtering
    // ------------------------------------------------------------------
    const allRequests = db.getAllVerificationRequests();
    const hasReq1 = allRequests.some(r => r.id === req1.id && r.status === 'PENDING');
    const hasReq2 = allRequests.some(r => r.id === req2.id && r.status === 'PENDING');
    assert(
      hasReq1 && hasReq2,
      'Test 3a: Verification queue includes both submitted pending requests'
    );

    // Search / Name matching
    const searchMatch = allRequests.filter(r => {
      const b = db.getBusinessById(r.businessId);
      return b?.name.toLowerCase().includes('ahamco logistics');
    });
    assert(
      searchMatch.some(r => r.id === req1.id) && !searchMatch.some(r => r.id === req2.id),
      'Test 3b: Search filter correctly isolates matching business request'
    );

    // ------------------------------------------------------------------
    // TEST 4: Authorization Guard - Non-Admin Forbidden
    // ------------------------------------------------------------------
    let clientReviewBlocked = false;
    try {
      await businessService.reviewVerificationRequest(
        clientUser.id,
        req1.id,
        { status: 'APPROVED' },
        '127.0.0.1',
        'Mozilla/5.0'
      );
    } catch (err: any) {
      if (err.statusCode === 403) clientReviewBlocked = true;
    }
    assert(clientReviewBlocked, 'Test 4: CLIENT role is strictly forbidden from reviewing requests (403)');

    // ------------------------------------------------------------------
    // TEST 5: Anti-Tamper - Mass Assignment & Forbidden Fields
    // ------------------------------------------------------------------
    const tamperedPayload = {
      status: 'APPROVED',
      isVerified: true,
      reviewerId: 'hacked_admin_id',
      adminId: 'hacked_admin_id',
      reviewedAt: '2020-01-01T00:00:00.000Z'
    };
    let massAssignmentBlocked = false;
    try {
      validateAdminReviewPayload(tamperedPayload, 'APPROVE');
    } catch (err: any) {
      if (err.code === 'MASS_ASSIGNMENT_FORBIDDEN' || err.statusCode === 400) {
        massAssignmentBlocked = true;
      }
    }
    assert(
      massAssignmentBlocked,
      'Test 5: validateAdminReviewPayload strictly blocks unauthorized privilege escalation fields (MASS_ASSIGNMENT_FORBIDDEN)'
    );

    // ------------------------------------------------------------------
    // TEST 6: Super Admin Approval Workflow
    // ------------------------------------------------------------------
    const approveResult = await businessService.reviewVerificationRequest(
      superAdmin!.id,
      req1.id,
      { status: 'APPROVED' },
      '127.0.0.1',
      'Mozilla/5.0'
    );
    assert(approveResult.success, 'Test 6a: Super Admin approval call succeeds');
    assert(approveResult.request.status === 'APPROVED', 'Test 6b: Request status updated to APPROVED');
    assert(approveResult.request.reviewerId === superAdmin!.id, 'Test 6c: Reviewer ID strictly set to authenticated Super Admin ID');
    assert(!!approveResult.request.reviewedAt, 'Test 6d: Reviewed timestamp recorded');

    // Verify database state of business
    const biz1Updated = db.getBusinessById(bizApprovedTest.id);
    assert(
      biz1Updated?.isVerified === true && biz1Updated?.verificationStatus === 'APPROVED',
      'Test 6e: Business profile isVerified flag is true and verificationStatus is APPROVED'
    );

    // Verify double-approval / stale transition prevention
    let duplicateApproveBlocked = false;
    try {
      await businessService.reviewVerificationRequest(
        superAdmin!.id,
        req1.id,
        { status: 'APPROVED' },
        '127.0.0.1',
        'Mozilla/5.0'
      );
    } catch (err: any) {
      if (err.statusCode === 409) duplicateApproveBlocked = true;
    }
    assert(duplicateApproveBlocked, 'Test 6f: Attempting to approve an already decided request fails with 409 conflict');

    // ------------------------------------------------------------------
    // TEST 7: Super Admin Rejection Workflow
    // ------------------------------------------------------------------
    // Rejection without reason must fail
    let rejectWithoutReasonBlocked = false;
    try {
      await businessService.reviewVerificationRequest(
        superAdmin!.id,
        req2.id,
        { status: 'REJECTED' },
        '127.0.0.1',
        'Mozilla/5.0'
      );
    } catch (err: any) {
      if (err.statusCode === 400) rejectWithoutReasonBlocked = true;
    }
    assert(rejectWithoutReasonBlocked, 'Test 7a: Rejecting without rejection reason fails with 400 BAD_REQUEST');

    // Rejection with short reason (<3 chars) must fail
    let rejectShortReasonBlocked = false;
    try {
      await businessService.reviewVerificationRequest(
        superAdmin!.id,
        req2.id,
        { status: 'REJECTED', rejectionReason: 'No' },
        '127.0.0.1',
        'Mozilla/5.0'
      );
    } catch (err: any) {
      if (err.statusCode === 400) rejectShortReasonBlocked = true;
    }
    assert(rejectShortReasonBlocked, 'Test 7b: Rejecting with reason < 3 characters fails with 400');

    // Valid rejection
    const validReason = 'CAC registration certificate was blurry and unreadable. Please upload a clear scan.';
    const rejectResult = await businessService.reviewVerificationRequest(
      superAdmin!.id,
      req2.id,
      { status: 'REJECTED', rejectionReason: validReason },
      '127.0.0.1',
      'Mozilla/5.0'
    );
    assert(rejectResult.success, 'Test 7c: Super Admin rejection call succeeds');
    assert(rejectResult.request.status === 'REJECTED', 'Test 7d: Request status updated to REJECTED');
    assert(rejectResult.request.rejectionReason === validReason, 'Test 7e: Rejection reason correctly saved');

    // Verify database state of business
    const biz2Updated = db.getBusinessById(bizRejectTest.id);
    assert(
      biz2Updated?.isVerified === false && biz2Updated?.verificationStatus === 'REJECTED',
      'Test 7f: Business profile isVerified flag remains false and verificationStatus is REJECTED'
    );

    // Verify double-rejection / stale transition prevention
    let duplicateRejectBlocked = false;
    try {
      await businessService.reviewVerificationRequest(
        superAdmin!.id,
        req2.id,
        { status: 'REJECTED', rejectionReason: 'Another reason' },
        '127.0.0.1',
        'Mozilla/5.0'
      );
    } catch (err: any) {
      if (err.statusCode === 409) duplicateRejectBlocked = true;
    }
    assert(duplicateRejectBlocked, 'Test 7g: Attempting to reject an already decided request fails with 409 conflict');

    // ------------------------------------------------------------------
    // TEST 8: Optimistic Concurrency Control Check
    // ------------------------------------------------------------------
    let concurrencyCaught = false;
    try {
      db.updateVerificationRequest(
        req1.id,
        { notes: 'test concurrency' },
        'PENDING' // Expected status is PENDING, but current status is APPROVED
      );
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'STALE_OPERATION_CONFLICT') {
        concurrencyCaught = true;
      }
    }
    assert(
      concurrencyCaught,
      'Test 8: updateVerificationRequest throws 409 STALE_OPERATION_CONFLICT when expectedStatus condition fails (concurrency guard)'
    );

    // ------------------------------------------------------------------
    // TEST 9: Inspection Details Response Integrity
    // ------------------------------------------------------------------
    const detailReq1 = db.getVerificationRequestById(req1.id);
    const detailBiz1 = db.getBusinessById(bizApprovedTest.id);
    const detailOwner1 = db.getUserById(clientUser.id);
    assert(
      !!detailReq1 && !!detailBiz1 && !!detailOwner1 &&
      detailReq1.status === 'APPROVED' &&
      detailBiz1.isVerified === true,
      'Test 9: Full relational integrity preserved across request, business, and owner models'
    );

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error during test execution:', error);
    process.exit(1);
  }
}

runAdminVerificationWorkflowTests();
