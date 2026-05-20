import {
  assignReviewCase,
  createReviewCase,
  decideStoredReviewCase
} from "./admin-review-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromAdminReview,
  createUValueEventFromAdminReview
} from "./admin-review-event-factory";

const userId = crypto.randomUUID();
const walletId = crypto.randomUUID();
const withdrawalRequestId = crypto.randomUUID();

const reviewCase = createReviewCase({
  subjectType: "withdrawal",
  subjectId: withdrawalRequestId,
  userId,
  walletId,
  reason: "payment_risk",
  priority: "high",
  evidencePacket: {
    sourceEventIds: [crypto.randomUUID()],
    sourceObjectType: "withdrawal_request",
    sourceObjectId: withdrawalRequestId,
    machineSummary: "Withdrawal was held because payout risk exceeded normal threshold."
  }
});

assignReviewCase({
  reviewCaseId: reviewCase.reviewCaseId,
  reviewerId: crypto.randomUUID()
});

const reviewResult = decideStoredReviewCase({
  reviewCaseId: reviewCase.reviewCaseId,

  evidenceStrengthScore: 0.85,
  automatedRecommendationScore: 0.8,
  policyConfidenceScore: 0.85,
  reviewerConsistencyScore: 0.82,
  reviewQualityScore: 0.84,

  reviewerDecision: "approve",
  decisionConfidenceScore: 0.86,

  appealEvidenceStrengthScore: 0,
  appealUserCredibilityScore: 0,
  appealAbuseRisk: 0,

  manipulationRisk: 0.02,
  collusionRisk: 0.02,
  reviewerBiasRisk: 0.02,
  policyMismatchRisk: 0.02,
  systemErrorLikelihood: 0.05,

  ageBand: "18_plus"
});

const trustEvent = createTrustEventFromAdminReview(reviewResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromAdminReview(reviewResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

/**
 * Production use:
 * If reviewResult.approvePayout === true:
 * - resume payout workflow
 *
 * If reviewResult.releaseHold === true:
 * - release wallet/withdrawal hold
 *
 * If reviewResult.lockWallet === true:
 * - apply wallet lock
 *
 * If reviewResult.approveGrant === true:
 * - mark value grant approved
 */

console.log("Admin review:");
console.log(JSON.stringify(reviewResult, null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
