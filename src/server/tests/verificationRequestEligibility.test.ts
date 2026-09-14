/**
 * TASK 2.3.1: BUSINESS VERIFICATION REQUEST TESTS
 * 
 * Verifies:
 * 1. Eligibility validation on business profile completeness (name, description, category, location, contact)
 * 2. Ineligible business rejected from submitting verification request (400 INELIGIBLE_PROFILE)
 * 3. Non-owner / unauthorized user rejected with 403 FORBIDDEN
 * 4. Eligible business owner can submit verification request with status transitioning to PENDING
 * 5. Exactly one active PENDING request permitted per business (409 conflict)
 * 6. Approved/Verified business cannot resubmit verification (400 ALREADY_VERIFIED)
 * 7. Verification eligibility endpoint returns structured breakdown of missing fields
 */

import { businessService } from '../services/businessService';
import { db, SUPER_ADMIN_EMAIL, SUPER_ADMIN_ID } from '../db';
import { validateBusinessVerificationEligibility } from '../validators/businessValidators';

async function runTask231Tests() {
  console.log('====================================================');
  console.log('RUNNING TASK 2.3.1: BUSINESS VERIFICATION REQUEST TESTS');
  console.log('====================================================');

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
    // ------------------------------------------------------------------
    // FIXTURES SETUP
    // ------------------------------------------------------------------
    const merchantUser = {
      id: `usr_merchant_231_${Date.now()}`,
      email: `merchant231_${Date.now()}@test.com`,
      name: 'Task 231 Merchant',
      role: 'CLIENT' as const,
      status: 'ACTIVE' as const,
      clientType: 'business' as const,
      tier: 'pro' as const,
      createdAt: new Date().toISOString()
    };
    db.users.set(merchantUser.id, { ...merchantUser, failedLoginAttempts: 0 });

    const otherUser = {
      id: `usr_other_231_${Date.now()}`,
      email: `other231_${Date.now()}@test.com`,
      name: 'Other User',
      role: 'CLIENT' as const,
      status: 'ACTIVE' as const,
      clientType: 'business' as const,
      tier: 'free' as const,
      createdAt: new Date().toISOString()
    };
    db.users.set(otherUser.id, { ...otherUser, failedLoginAttempts: 0 });

    // ------------------------------------------------------------------
    // TEST 1: Eligibility Validator - Bare business is ineligible
    // ------------------------------------------------------------------
    const emptyBizResult = validateBusinessVerificationEligibility({});
    assert(
      emptyBizResult.eligible === false &&
      emptyBizResult.missingFields.length === 5 &&
      emptyBizResult.missingFields.includes('name') &&
      emptyBizResult.missingFields.includes('description') &&
      emptyBizResult.missingFields.includes('category') &&
      emptyBizResult.missingFields.includes('location') &&
      emptyBizResult.missingFields.includes('contact'),
      'Test 1: Empty business fails eligibility with all 5 required fields identified'
    );

    // ------------------------------------------------------------------
    // TEST 2: Eligibility Validator - Short description (<10 chars)
    // ------------------------------------------------------------------
    const shortDescResult = validateBusinessVerificationEligibility({
      name: 'Apex Solutions',
      description: 'Too short',
      category: 'tech',
      location: { city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
      phone: '+2348000000000'
    });
    assert(
      shortDescResult.eligible === false &&
      shortDescResult.missingFields.includes('description') &&
      shortDescResult.missingFields.length === 1,
      'Test 2: Description under 10 chars is flagged as ineligible'
    );

    // ------------------------------------------------------------------
    // TEST 3: Eligibility Validator - Complete profile is eligible
    // ------------------------------------------------------------------
    const completeBizData = {
      name: 'Apex Solutions International',
      description: 'Premium software development and enterprise cloud solutions in West Africa.',
      category: 'tech',
      location: {
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        address: 'Plot 10 Silicon Way'
      },
      phone: '+2348011223344',
      email: 'contact@apexsolutions.ng'
    };
    const eligibleResult = validateBusinessVerificationEligibility(completeBizData);
    assert(
      eligibleResult.eligible === true &&
      eligibleResult.missingFields.length === 0,
      'Test 3: Fully populated business profile satisfies all eligibility criteria'
    );

    // ------------------------------------------------------------------
    // TEST 4: Service Layer - Incomplete profile cannot submit verification
    // ------------------------------------------------------------------
    const incompleteBiz = {
      id: `biz_incomp_${Date.now()}`,
      name: 'Incomplete Biz',
      slug: `incomplete-biz-${Date.now()}`,
      ownerId: merchantUser.id,
      isVerified: false,
      verificationStatus: 'NOT_SUBMITTED' as const,
      createdAt: new Date().toISOString()
    };
    db.businesses.set(incompleteBiz.id, incompleteBiz);

    let submitIneligibleBlocked = false;
    try {
      await businessService.submitVerificationRequest(merchantUser.id, incompleteBiz.id, {
        notes: 'Trying to verify an empty profile'
      });
    } catch (err: any) {
      if (err.statusCode === 400 && err.code === 'INELIGIBLE_PROFILE') {
        submitIneligibleBlocked = true;
      }
    }
    assert(
      submitIneligibleBlocked,
      'Test 4: Ineligible business submission is blocked with 400 INELIGIBLE_PROFILE'
    );

    // ------------------------------------------------------------------
    // TEST 5: Service Layer - checkVerificationEligibility API method
    // ------------------------------------------------------------------
    const eligibilityCheck = await businessService.checkVerificationEligibility(merchantUser.id, incompleteBiz.id);
    assert(
      eligibilityCheck.eligible === false &&
      eligibilityCheck.missingFields.length > 0 &&
      eligibilityCheck.success === true,
      'Test 5: checkVerificationEligibility accurately reports incomplete status to owner'
    );

    // ------------------------------------------------------------------
    // TEST 6: Anti-IDOR - Non-owner cannot check eligibility or submit
    // ------------------------------------------------------------------
    let idorEligibilityBlocked = false;
    try {
      await businessService.checkVerificationEligibility(otherUser.id, incompleteBiz.id);
    } catch (err: any) {
      if (err.statusCode === 403) {
        idorEligibilityBlocked = true;
      }
    }
    assert(idorEligibilityBlocked, 'Test 6: Non-owner blocked from querying business verification eligibility (403)');

    let idorSubmitBlocked = false;
    try {
      await businessService.submitVerificationRequest(otherUser.id, incompleteBiz.id, {});
    } catch (err: any) {
      if (err.statusCode === 403) {
        idorSubmitBlocked = true;
      }
    }
    assert(idorSubmitBlocked, 'Test 6b: Non-owner blocked from submitting verification for another user business (403)');

    // ------------------------------------------------------------------
    // TEST 7: Eligible business submits verification successfully
    // ------------------------------------------------------------------
    const eligibleBiz = {
      id: `biz_elig_${Date.now()}`,
      name: completeBizData.name,
      slug: `apex-solutions-${Date.now()}`,
      description: completeBizData.description,
      category: completeBizData.category,
      categories: [completeBizData.category],
      location: completeBizData.location,
      phone: completeBizData.phone,
      email: completeBizData.email,
      ownerId: merchantUser.id,
      isVerified: false,
      verificationStatus: 'NOT_SUBMITTED' as const,
      createdAt: new Date().toISOString()
    };
    db.businesses.set(eligibleBiz.id, eligibleBiz);

    const submissionRes = await businessService.submitVerificationRequest(merchantUser.id, eligibleBiz.id, {
      notes: 'CAC Registration RC-987654. Certified registered enterprise.'
    });

    assert(
      submissionRes.success === true &&
      submissionRes.request.status === 'PENDING' &&
      submissionRes.request.businessId === eligibleBiz.id &&
      submissionRes.request.notes?.includes('CAC Registration RC-987654'),
      'Test 7: Eligible business owner submits verification request; status is PENDING'
    );

    // ------------------------------------------------------------------
    // TEST 8: Anti-Duplicate - Concurrent submission blocked while PENDING
    // ------------------------------------------------------------------
    let duplicateBlocked = false;
    try {
      await businessService.submitVerificationRequest(merchantUser.id, eligibleBiz.id, {
        notes: 'Spamming a second request'
      });
    } catch (err: any) {
      if (err.statusCode === 409 && err.code === 'PENDING_REQUEST_EXISTS') {
        duplicateBlocked = true;
      }
    }
    assert(duplicateBlocked, 'Test 8: Exactly one active PENDING request permitted per business (409 PENDING_REQUEST_EXISTS)');

    // ------------------------------------------------------------------
    // TEST 9: Super Admin Approval flow
    // ------------------------------------------------------------------
    const superAdmin = db.getUserById(SUPER_ADMIN_ID) || db.getUserByEmail(SUPER_ADMIN_EMAIL);
    assert(!!superAdmin, 'Test 9a: Designated Super Admin exists');

    const approveRes = await businessService.reviewVerificationRequest(
      superAdmin!.id,
      submissionRes.request.id,
      { status: 'APPROVED' }
    );
    assert(
      approveRes.success === true &&
      approveRes.request.status === 'APPROVED' &&
      approveRes.request.reviewerId === superAdmin!.id,
      'Test 9b: Super Admin successfully approves verification request'
    );

    const updatedBiz = db.businesses.get(eligibleBiz.id);
    assert(
      updatedBiz?.isVerified === true &&
      updatedBiz?.verificationStatus === 'APPROVED',
      'Test 9c: Business record is updated with isVerified: true and verificationStatus: APPROVED'
    );

    // ------------------------------------------------------------------
    // TEST 10: Already verified business cannot submit again
    // ------------------------------------------------------------------
    let verifiedResubmitBlocked = false;
    try {
      await businessService.submitVerificationRequest(merchantUser.id, eligibleBiz.id, {});
    } catch (err: any) {
      if (err.statusCode === 400 && err.code === 'ALREADY_VERIFIED') {
        verifiedResubmitBlocked = true;
      }
    }
    assert(verifiedResubmitBlocked, 'Test 10: Verified business blocked from re-submitting verification (400 ALREADY_VERIFIED)');

  } catch (err: any) {
    console.error('Unexpected error in test suite:', err);
    failed++;
  }

  console.log('====================================================');
  console.log(`TASK 2.3.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTask231Tests().catch((e) => {
  console.error(e);
  process.exit(1);
});
