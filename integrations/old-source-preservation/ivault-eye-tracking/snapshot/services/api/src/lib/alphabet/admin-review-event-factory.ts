import type { AdminReviewResult } from "../../types/alphabet/admin-appeal-review.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromAdminReview(
  result: AdminReviewResult
): TrustImpactEvent | null {
  if (!result.userId) return null;

  if (result.reviewAbuseDetectedEvent) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "review_abuse_detected",
      category: "safety",
      severity: "negative_medium",
      sourceEventId: result.reviewAbuseDetectedEvent.eventId,
      confidence: 0.75,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        reasons: result.reasons,
        reviewRiskScore: result.reviewRiskScore
      }
    });
  }

  if (result.finalDecision === "reverse" || result.reversePenalty || result.releaseHold) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "admin_review_reversed_penalty",
      category: "reputation",
      severity: "positive_medium",
      sourceEventId:
        result.adminOverrideAppliedEvent?.eventId ??
        result.appealDecisionRecordedEvent?.eventId ??
        result.reviewDecisionRecordedEvent?.eventId ??
        null,
      confidence: result.reviewConfidenceScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        finalDecision: result.finalDecision,
        appealStatus: result.appealStatus
      }
    });
  }

  if (result.finalDecision === "approve" || result.approvePayout || result.approveGrant) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "admin_review_approved",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.adminOverrideAppliedEvent?.eventId ??
        result.reviewDecisionRecordedEvent?.eventId ??
        null,
      confidence: result.reviewConfidenceScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        finalDecision: result.finalDecision
      }
    });
  }

  if (result.finalDecision === "restrict" || result.restrictUser || result.lockWallet) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "admin_restriction_applied",
      category: "reputation",
      severity: "negative_large",
      sourceEventId: result.reviewDecisionRecordedEvent?.eventId ?? null,
      confidence: result.reviewConfidenceScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        finalDecision: result.finalDecision,
        lockWallet: result.lockWallet,
        lockWithdrawals: result.lockWithdrawals,
        lockCampaigns: result.lockCampaigns
      }
    });
  }

  return null;
}

export function createUValueEventFromAdminReview(
  result: AdminReviewResult
): UValueImpactEvent | null {
  if (!result.userId) return null;

  if (result.reviewAbuseDetectedEvent) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "review_abuse_detected",
      category: "safety",
      severity: "negative_medium",
      coinCode: "J",
      sourceEventId: result.reviewAbuseDetectedEvent.eventId,
      confidence: 0.75,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        reasons: result.reasons
      }
    });
  }

  if (result.finalDecision === "reverse" || result.reversePenalty || result.releaseHold) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "admin_review_reversed_penalty",
      category: "reputation",
      severity: "positive_medium",
      coinCode: "J",
      sourceEventId:
        result.adminOverrideAppliedEvent?.eventId ??
        result.appealDecisionRecordedEvent?.eventId ??
        null,
      confidence: result.reviewConfidenceScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        finalDecision: result.finalDecision
      }
    });
  }

  if (result.finalDecision === "approve" || result.approvePayout || result.approveGrant) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "admin_review_approved",
      category: "reputation",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId:
        result.adminOverrideAppliedEvent?.eventId ??
        result.reviewDecisionRecordedEvent?.eventId ??
        null,
      confidence: result.reviewConfidenceScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        finalDecision: result.finalDecision
      }
    });
  }

  if (result.finalDecision === "restrict" || result.restrictUser || result.lockWallet) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "admin_restriction_applied",
      category: "reputation",
      severity: "negative_large",
      coinCode: "J",
      sourceEventId: result.reviewDecisionRecordedEvent?.eventId ?? null,
      confidence: result.reviewConfidenceScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        finalDecision: result.finalDecision
      }
    });
  }

  return null;
}
