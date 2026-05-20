import type { CompensationEvaluationResult } from "@/types/alphabet/compensation.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromCompensationResult(
  result: CompensationEvaluationResult
): TrustImpactEvent | null {
  if (result.completed || result.executeReversal) {
    return createTrustImpactEvent({
      userId: result.originalUserId,
      eventType: "compensation_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.compensationCompletedEvent?.eventId ??
        result.compensationReversalExecutedEvent?.eventId ??
        result.compensationReadyEvent?.eventId ??
        null,
      confidence: result.compensationSafetyScore,
      metadata: {
        compensationId: result.compensationId,
        compensationType: result.compensationType,
        status: result.status
      }
    });
  }

  if (result.blocked || result.failed || result.requiresReview) {
    return createTrustImpactEvent({
      userId: result.originalUserId,
      eventType: "compensation_risk_detected",
      category: "reputation",
      severity: result.failed ? "negative_medium" : "negative_small",
      sourceEventId:
        result.compensationFailedEvent?.eventId ??
        result.compensationBlockedEvent?.eventId ??
        result.compensationRequiresReviewEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        compensationId: result.compensationId,
        compensationType: result.compensationType,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromCompensationResult(
  result: CompensationEvaluationResult
): UValueImpactEvent | null {
  if (result.completed || result.executeReversal) {
    return createUValueImpactEvent({
      userId: result.originalUserId,
      eventType: "compensation_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId:
        result.compensationCompletedEvent?.eventId ??
        result.compensationReversalExecutedEvent?.eventId ??
        null,
      confidence: result.compensationSafetyScore,
      metadata: {
        compensationId: result.compensationId,
        compensationType: result.compensationType
      }
    });
  }

  if (result.failed || result.blocked) {
    return createUValueImpactEvent({
      userId: result.originalUserId,
      eventType: "compensation_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.compensationFailedEvent?.eventId ??
        result.compensationBlockedEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        compensationId: result.compensationId,
        compensationType: result.compensationType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
