import {
  assignReviewCase,
  createReviewCase,
  evaluateStoredReviewCase,
  recordReviewDecision,
  startReviewCase
} from "./review-store";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  createTrustEventFromReviewResult,
  createUValueEventFromReviewResult
} from "./review-event-factory";

const ownerUserId = crypto.randomUUID();
const contentSafetyId = crypto.randomUUID();

const reviewCase = createReviewCase({
  subjectType: "content_safety",
  subjectId: contentSafetyId,
  subjectOwnerUserId: ownerUserId,
  reason: "safety_risk",
  priority: "high",
  evidencePacketId: crypto.randomUUID(),
  sourceEventIds: [crypto.randomUUID()]
});

assignReviewCase({
  reviewCaseId: reviewCase.reviewCaseId,
  reviewerRole: "safety_specialist",
  reviewerUserId: crypto.randomUUID()
});

startReviewCase(reviewCase.reviewCaseId);

recordReviewDecision({
  reviewCaseId: reviewCase.reviewCaseId,
  decision: "restore",
  decisionSummary:
    "After reviewing the evidence, the content does not violate the safety rules and can be restored with standard exposure."
});

const reviewResult = evaluateStoredReviewCase({
  reviewCaseId: reviewCase.reviewCaseId,

  appealRequested: false,

  decisionConfidenceScore: 0.9,
  reviewerConfidenceScore: 0.9,
  evidenceCompletenessScore: 0.9,

  riskScore: 0.18,
  severityScore: 0.22,

  fraudRisk: 0.01,
  safetyRisk: 0.18,
  complianceRisk: 0.01,
  paymentRisk: 0.01,
  rightsRisk: 0.01,

  downstreamCorrectionRequested: true,
  correctionInstructions: [
    {
      targetSystem: "content_safety",
      targetObjectId: contentSafetyId,
      action: "restore",
      reasonCode: "review_restored_content",
      payload: {
        exposureLevel: "public",
        recommendationEligible: true
      }
    },
    {
      targetSystem: "notification",
      targetObjectId: ownerUserId,
      action: "notify",
      reasonCode: "review_completed_positive"
    },
    {
      targetSystem: "audit",
      targetObjectId: reviewCase.reviewCaseId,
      action: "audit",
      reasonCode: "review_resolution_audit"
    }
  ],

  requesterIsSubjectOwner: true,
  requesterUserId: ownerUserId
});

const trustEvent = createTrustEventFromReviewResult(reviewResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromReviewResult(reviewResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

console.log("Review:");
console.log(JSON.stringify(reviewResult, null, 2));

console.log("Owner Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(ownerUserId), null, 2));

console.log("Owner U Value:");
console.log(JSON.stringify(getOrCreateUValueState(ownerUserId), null, 2));
