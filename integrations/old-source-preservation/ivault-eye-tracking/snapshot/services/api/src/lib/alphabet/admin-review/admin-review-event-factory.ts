import { ALPHABET_SYSTEM_USER_ID } from "@/lib/alphabet/db-repositories/alphabet-events.repository";
import type { AdminReviewEvaluationResult } from "@/types/alphabet/admin-review.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

function subjectUserId(result: AdminReviewEvaluationResult): string {
  const meta = result.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const sid = (meta as { subjectUserId?: unknown }).subjectUserId;
    if (typeof sid === "string" && sid.length > 0) return sid;
  }
  return ALPHABET_SYSTEM_USER_ID;
}

export function createTrustEventFromAdminReviewResult(
  result: AdminReviewEvaluationResult
): TrustImpactEvent | null {
  const userId = subjectUserId(result);

  if (result.decisionAllowed || result.ready) {
    return createTrustImpactEvent({
      userId,
      eventType: "admin_review_clean",
      category: "reputation",
      severity: "positive_small",
      objectType: "admin_review_case",
      objectId: result.reviewCaseId,
      sourceEventId:
        result.adminReviewApprovedEvent?.eventId ??
        result.adminReviewQueuedEvent?.eventId ??
        null,
      confidence: result.decisionSafetyScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        reviewCaseType: result.reviewCaseType,
        status: result.status
      }
    });
  }

  if (result.decisionBlocked || result.escalationRequired || result.requiresMoreInfo) {
    return createTrustImpactEvent({
      userId,
      eventType: "admin_review_risk_detected",
      category: "reputation",
      severity: result.escalationRequired ? "negative_medium" : "negative_small",
      objectType: "admin_review_case",
      objectId: result.reviewCaseId,
      sourceEventId:
        result.adminReviewRejectedEvent?.eventId ??
        result.adminReviewEscalatedEvent?.eventId ??
        result.adminReviewMoreInfoRequestedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        reviewCaseType: result.reviewCaseType,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromAdminReviewResult(
  result: AdminReviewEvaluationResult
): UValueImpactEvent | null {
  const userId = subjectUserId(result);

  if (result.decisionAllowed) {
    return createUValueImpactEvent({
      userId,
      eventType: "admin_review_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      objectType: "admin_review_case",
      objectId: result.reviewCaseId,
      sourceEventId: result.adminReviewApprovedEvent?.eventId ?? null,
      confidence: result.decisionSafetyScore,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        reviewCaseType: result.reviewCaseType
      }
    });
  }

  if (result.decisionBlocked || result.escalationRequired) {
    return createUValueImpactEvent({
      userId,
      eventType: "admin_review_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      objectType: "admin_review_case",
      objectId: result.reviewCaseId,
      sourceEventId:
        result.adminReviewRejectedEvent?.eventId ??
        result.adminReviewEscalatedEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        reviewCaseId: result.reviewCaseId,
        reviewCaseType: result.reviewCaseType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
