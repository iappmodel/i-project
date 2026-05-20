import type { ReviewEvaluationResult } from "../../types/alphabet/review.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromReviewResult(
  result: ReviewEvaluationResult
): TrustImpactEvent | null {
  if (!result.subjectOwnerUserId) return null;

  if (result.status === "review_resolved" || result.status === "review_decided") {
    if (
      result.decision === "approve" ||
      result.decision === "release_hold" ||
      result.decision === "restore" ||
      result.decision === "overturn"
    ) {
      return createTrustImpactEvent({
        userId: result.subjectOwnerUserId,
        eventType: "review_positive_resolution",
        category: "reputation",
        severity: "positive_small",
        sourceEventId:
          result.reviewCaseResolvedEvent?.eventId ??
          result.reviewDecisionMadeEvent?.eventId ??
          null,
        confidence: result.resolutionIntegrityScore,
        metadata: {
          reviewCaseId: result.reviewCaseId,
          subjectType: result.subjectType,
          subjectId: result.subjectId,
          decision: result.decision,
          reasons: result.reasons
        }
      });
    }

    if (
      result.decision === "reject" ||
      result.decision === "maintain_hold" ||
      result.decision === "remove" ||
      result.decision === "uphold"
    ) {
      return createTrustImpactEvent({
        userId: result.subjectOwnerUserId,
        eventType: "review_negative_resolution",
        category: "reputation",
        severity: "negative_small",
        sourceEventId:
          result.reviewCaseResolvedEvent?.eventId ??
          result.reviewDecisionMadeEvent?.eventId ??
          null,
        confidence: result.resolutionIntegrityScore,
        metadata: {
          reviewCaseId: result.reviewCaseId,
          subjectType: result.subjectType,
          subjectId: result.subjectId,
          decision: result.decision,
          reasons: result.reasons
        }
      });
    }
  }

  if (result.status === "review_escalated") {
    return createTrustImpactEvent({
      userId: result.subjectOwnerUserId,
      eventType: "review_escalated",
      category: "safety",
      severity: "negative_medium",
      sourceEventId: result.reviewCaseEscalatedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromReviewResult(
  result: ReviewEvaluationResult
): UValueImpactEvent | null {
  if (!result.subjectOwnerUserId) return null;

  if (result.status === "review_resolved" || result.status === "review_decided") {
    if (
      result.decision === "approve" ||
      result.decision === "release_hold" ||
      result.decision === "restore" ||
      result.decision === "overturn"
    ) {
      return createUValueImpactEvent({
        userId: result.subjectOwnerUserId,
        eventType: "review_positive_resolution",
        category: "trust",
        severity: "positive_small",
        coinCode: "J",
        sourceEventId:
          result.reviewCaseResolvedEvent?.eventId ??
          result.reviewDecisionMadeEvent?.eventId ??
          null,
        confidence: result.resolutionIntegrityScore,
        metadata: {
          reviewCaseId: result.reviewCaseId,
          subjectType: result.subjectType,
          subjectId: result.subjectId,
          decision: result.decision
        }
      });
    }

    if (
      result.decision === "reject" ||
      result.decision === "maintain_hold" ||
      result.decision === "remove" ||
      result.decision === "uphold"
    ) {
      return createUValueImpactEvent({
        userId: result.subjectOwnerUserId,
        eventType: "review_negative_resolution",
        category: "trust",
        severity: "negative_small",
        coinCode: "J",
        sourceEventId:
          result.reviewCaseResolvedEvent?.eventId ??
          result.reviewDecisionMadeEvent?.eventId ??
          null,
        confidence: result.resolutionIntegrityScore,
        metadata: {
          reviewCaseId: result.reviewCaseId,
          subjectType: result.subjectType,
          subjectId: result.subjectId,
          decision: result.decision
        }
      });
    }
  }

  if (result.status === "review_escalated") {
    return createUValueImpactEvent({
      userId: result.subjectOwnerUserId,
      eventType: "review_escalated",
      category: "safety",
      severity: "negative_medium",
      coinCode: "J",
      sourceEventId: result.reviewCaseEscalatedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        reasons: result.reasons
      }
    });
  }

  return null;
}
