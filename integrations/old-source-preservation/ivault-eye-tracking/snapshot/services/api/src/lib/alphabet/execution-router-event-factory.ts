import type { ExecutionRouterEvaluationResult } from "../../types/alphabet/execution-router.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromExecutionResult(
  result: ExecutionRouterEvaluationResult
): TrustImpactEvent | null {
  if (result.completed || result.dispatched || result.dispatchAllowed) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "execution_clean_dispatch",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.executionCompletedEvent?.eventId ??
        result.executionDispatchedEvent?.eventId ??
        result.executionAllowedEvent?.eventId ??
        null,
      confidence: result.dispatchSafetyScore,
      metadata: {
        executionRequestId: result.executionRequestId,
        targetSystem: result.targetSystem,
        action: result.action,
        status: result.status
      }
    });
  }

  if (result.dispatchDenied || result.failed || result.requiresReview) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "execution_risk_detected",
      category: "reputation",
      severity: result.dispatchDenied || result.failed ? "negative_medium" : "negative_small",
      sourceEventId:
        result.executionDeniedEvent?.eventId ??
        result.executionFailedEvent?.eventId ??
        result.executionRequiresReviewEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        executionRequestId: result.executionRequestId,
        targetSystem: result.targetSystem,
        action: result.action,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromExecutionResult(
  result: ExecutionRouterEvaluationResult
): UValueImpactEvent | null {
  if (result.completed) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "execution_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.executionCompletedEvent?.eventId ?? null,
      confidence: result.dispatchSafetyScore,
      metadata: {
        executionRequestId: result.executionRequestId,
        targetSystem: result.targetSystem,
        action: result.action
      }
    });
  }

  if (result.dispatchDenied || result.failed) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: result.failed ? "execution_failed" : "execution_denied",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.executionFailedEvent?.eventId ??
        result.executionDeniedEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        executionRequestId: result.executionRequestId,
        targetSystem: result.targetSystem,
        action: result.action,
        reasons: result.reasons
      }
    });
  }

  return null;
}
