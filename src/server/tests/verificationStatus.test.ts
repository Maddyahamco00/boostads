/**
 * Comprehensive Verification Status Integration & Security Test Suite (Epic 2 Feature 2.3 Task 2.3.2)
 *
 * Verifies:
 * 1. Server-controlled 4-state lifecycle: NOT_SUBMITTED -> PENDING -> APPROVED | REJECTED -> (resubmission) PENDING
 * 2. Ownership & Anti-IDOR: Client cannot see another business's verification status
 * 3. Privilege Escalation Prevention: Client cannot set status, isVerified, or admin fields
 * 4. Super Admin Review & State Transitions
 * 5. Rejection Reason Delivery & Resubmission Flow
 * 6. Sensitive Field Masking (no reviewerId in public DTO)
 */

import { db, SUPER_ADMIN_EMAIL, SUPER_ADMIN_ID } from '../db';
import { businessService } from '../services/businessService';
import { validateNoVerificationPrivilegeEscalation } from '../validators/businessValidators';

async function runVerificationStatusTests() {
  console.log('====================================================');
  console.log('RUNNING TASK 2.3.2: BUSINESS VERIFICATION STATUS TESTS');
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
    // Setup test users & businesses
    const clientUser1 = {
      id: `usr_client_test1_${Date.now()}`,
      email: 'client1@test.com',
      name: 'Client One',
      role: 'CLIENT' as const,
      status: 'ACTIVE' as const,
      clientType: 'business' as const,
      tier: 'free' as const,
      createdAt: new Date().toISOString()
    };
    db.users.set(clientUser1.id, { ...clientUser1, failedLoginAttempts: 0 });

    const clientUser2 = {
      id: `usr_client_test2_${Date.now()}`,
      email: 'client2@test.com',
      name: 'Client Two',
      role: 'CLIENT' as const,
      status: 'ACTIVE' as const,
      clientType: 'business' as const,
      tier: 'free' as const,
      createdAt: new Date().toISOString()
    };
    db.users.set(clientUser2.id, { ...clientUser2, failedLoginAttempts: 0 });

    const biz1 = {
      id: `biz_test1_${Date.now()}`,
      name: 'Client 1 Enterprise',
      slug: `client-1-enterprise-${Date.now()}`,
      description: 'A verified testing enterprise business with full services.',
      category: 'tech',
      categories: ['tech'],
      location: {
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        address: '123 Tech Avenue'
      },
      phone: '+2348012345678',
      email: 'biz1@test.com',
      ownerId: clientUser1.id,
      isVerified: false,
      verificationStatus: 'NOT_SUBMITTED' as const,
      createdAt: new Date().toISOString()
    };
    db.businesses.set(biz1.id, biz1);

    const biz2 = {
      id: `biz_test2_${Date.now()}`,
      name: 'Client 2 Logistics',
      slug: `client-2-logistics-${Date.now()}`,
      description: 'Reliable logistics and delivery services nationwide.',
      category: 'logistics',
      categories: ['logistics'],
      location: {
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        address: '456 Express Road'
      },
      phone: '+2348098765432',
      email: 'biz2@test.com',
      ownerId: clientUser2.id,
      isVerified: false,
      verificationStatus: 'NOT_SUBMITTED' as const,
      createdAt: new Date().toISOString()
    };
    db.businesses.set(biz2.id, biz2);

    // ------------------------------------------------------------------
    // TEST 1: Initial State is NOT_SUBMITTED
    // ------------------------------------------------------------------
    const statusNotSubmitted = await businessService.getLatestVerificationRequest(clientUser1.id, biz1.id);
    assert(
      statusNotSubmitted.status === 'NOT_SUBMITTED' &&
      statusNotSubmitted.isVerified === false &&
      statusNotSubmitted.canResubmit === true &&
      statusNotSubmitted.request === null,
      'Test 1: Initial state is strictly NOT_SUBMITTED with request: null and isVerified: false'
    );

    // ------------------------------------------------------------------
    // TEST 2: Anti-IDOR - Cross-business verification status read blocked
    // ------------------------------------------------------------------
    let idorBlocked = false;
    try {
      await businessService.getLatestVerificationRequest(clientUser1.id, biz2.id);
    } catch (err: any) {
      if (err.statusCode === 403 && err.code === 'FORBIDDEN_NOT_OWNER') {
        idorBlocked = true;
      }
    }
    assert(idorBlocked, 'Test 2: Anti-IDOR: Client 1 cannot inspect verification status of Client 2 business (403)');

    // ------------------------------------------------------------------
    // TEST 3: Client cannot directly set verification status or isVerified
    // ------------------------------------------------------------------
    let escalationCaught = false;
    try {
      validateNoVerificationPrivilegeEscalation({
        status: 'APPROVED',
        isVerified: true,
        notes: 'Trying to verify myself'
      });
    } catch (err: any) {
      if (err.code === 'PRIVILEGE_ESCALATION_FORBIDDEN' || err.statusCode === 403) {
        escalationCaught = true;
      }
    }
    assert(escalationCaught, 'Test 3: Anti-Tamper: Client privilege escalation payload with status/isVerified blocked');

    // ------------------------------------------------------------------
    // TEST 4: Submit verification transitions status to PENDING
    // ------------------------------------------------------------------
    const submitResult = await businessService.submitVerificationRequest(
      clientUser1.id,
      biz1.id,
      { notes: 'Authentic CAC document registration RC-123456' }
    );
    assert(
      submitResult.success && submitResult.request.status === 'PENDING',
      'Test 4: Client submission succeeds with PENDING status'
    );

    const statusPending = await businessService.getLatestVerificationRequest(clientUser1.id, biz1.id);
    assert(
      statusPending.status === 'PENDING' &&
      statusPending.isVerified === false &&
      statusPending.canResubmit === false &&
      statusPending.request !== null &&
      statusPending.request.status === 'PENDING',
      'Test 4b: Business verification status is now server-controlled PENDING'
    );

    // ------------------------------------------------------------------
    // TEST 5: Prevent duplicate PENDING submissions
    // ------------------------------------------------------------------
    let duplicateBlocked = false;
    try {
      await businessService.submitVerificationRequest(clientUser1.id, biz1.id, { notes: 'Second try' });
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'DUPLICATE_PENDING_REQUEST') {
        duplicateBlocked = true;
      }
    }
    assert(duplicateBlocked, 'Test 5: Invariant: Exactly one active PENDING request permitted per business');

    // ------------------------------------------------------------------
    // TEST 6: Non-Admin cannot review verification request
    // ------------------------------------------------------------------
    let unauthorizedReviewBlocked = false;
    try {
      await businessService.reviewVerificationRequest(clientUser2.id, submitResult.request.id, {
        status: 'APPROVED'
      });
    } catch (err: any) {
      if (err.statusCode === 403) {
        unauthorizedReviewBlocked = true;
      }
    }
    assert(unauthorizedReviewBlocked, 'Test 6: Non-admin client cannot approve or review verification request (403)');

    // ------------------------------------------------------------------
    // TEST 7: Super Admin Approval Flow -> Status APPROVED & isVerified: true
    // ------------------------------------------------------------------
    const superAdmin = db.getUserById(SUPER_ADMIN_ID);
    assert(!!superAdmin && superAdmin.email === SUPER_ADMIN_EMAIL, 'Test 7a: Designated Super Admin exists in database');

    const approvalResult = await businessService.reviewVerificationRequest(
      SUPER_ADMIN_ID,
      submitResult.request.id,
      { status: 'APPROVED' }
    );
    assert(approvalResult.success && approvalResult.request.status === 'APPROVED', 'Test 7b: Super Admin approved verification request');

    const statusApproved = await businessService.getLatestVerificationRequest(clientUser1.id, biz1.id);
    assert(
      statusApproved.status === 'APPROVED' &&
      statusApproved.isVerified === true &&
      statusApproved.canResubmit === false &&
      statusApproved.request?.status === 'APPROVED' &&
      // Sensitive admin info check: reviewerId must NOT be exposed in PublicVerificationRequestDTO
      (statusApproved.request as any).reviewerId === undefined,
      'Test 7c: Business status is APPROVED, isVerified is true, reviewerId is masked from public DTO'
    );

    // ------------------------------------------------------------------
    // TEST 8: Re-submitting when already approved is blocked
    // ------------------------------------------------------------------
    let alreadyVerifiedBlocked = false;
    try {
      await businessService.submitVerificationRequest(clientUser1.id, biz1.id, { notes: 'Resubmit' });
    } catch (err: any) {
      if (err.statusCode === 400 && err.code === 'ALREADY_VERIFIED') {
        alreadyVerifiedBlocked = true;
      }
    }
    assert(alreadyVerifiedBlocked, 'Test 8: Cannot submit verification when already approved (400 ALREADY_VERIFIED)');

    // ------------------------------------------------------------------
    // TEST 9: Rejection Flow & Resubmission Lifecycle
    // ------------------------------------------------------------------
    // Client 2 submits for biz2
    const biz2Submit = await businessService.submitVerificationRequest(
      clientUser2.id,
      biz2.id,
      { notes: 'Review me please' }
    );

    // Super admin rejects biz2 with reason
    const rejectionResult = await businessService.reviewVerificationRequest(
      SUPER_ADMIN_ID,
      biz2Submit.request.id,
      {
        status: 'REJECTED',
        rejectionReason: 'Invalid business address provided. Please update with your physical office location.'
      }
    );
    assert(rejectionResult.success && rejectionResult.request.status === 'REJECTED', 'Test 9a: Super Admin rejected verification request');

    const statusRejected = await businessService.getLatestVerificationRequest(clientUser2.id, biz2.id);
    assert(
      statusRejected.status === 'REJECTED' &&
      statusRejected.isVerified === false &&
      statusRejected.canResubmit === true &&
      statusRejected.request?.status === 'REJECTED' &&
      statusRejected.request?.rejectionReason === 'Invalid business address provided. Please update with your physical office location.',
      'Test 9b: Business status is REJECTED, rejectionReason safely exposed to owner, canResubmit is true'
    );

    // Client 2 resubmits after fixing the issue
    const resubmitResult = await businessService.submitVerificationRequest(
      clientUser2.id,
      biz2.id,
      { notes: 'Updated physical address to Suite 402, Garki Mall, Abuja' }
    );
    assert(resubmitResult.success && resubmitResult.request.status === 'PENDING', 'Test 9c: Resubmission succeeds after rejection');

    const statusResubmitted = await businessService.getLatestVerificationRequest(clientUser2.id, biz2.id);
    assert(
      statusResubmitted.status === 'PENDING' &&
      statusResubmitted.isVerified === false &&
      statusResubmitted.canResubmit === false,
      'Test 9d: Status cleanly transitioned back to PENDING upon resubmission'
    );

    // ------------------------------------------------------------------
    // TEST 10: Super Admin Single Invariant Verification
    // ------------------------------------------------------------------
    const invariantCheck = db.verifySingleSuperAdminInvariant();
    assert(
      invariantCheck.valid && invariantCheck.count === 1 && invariantCheck.designatedEmail === SUPER_ADMIN_EMAIL,
      'Test 10: Exactly one Super Admin invariant holds strictly'
    );

  } catch (err: any) {
    console.error('Unexpected error during test execution:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationStatusTests();
