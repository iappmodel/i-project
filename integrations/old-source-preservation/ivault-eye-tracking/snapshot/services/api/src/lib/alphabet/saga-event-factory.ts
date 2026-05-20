import type { SagaEvaluationResult } from "../../types/alphabet/saga.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromSagaResult(result: SagaEvaluationResult): TrustImpactEvent | null {
  if (result.completed || result.compensated) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "saga_completed_cleanly",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.sagaCompletedEvent?.eventId ?? result.sagaCompensatedEvent?.eventId ?? null,
      confidence: result.completionConfidenceScore,
      metadata: {
        sagaId: result.sagaId,
        sagaType: result.sagaType,
        status: result.status
      }
    });
  }

  if (result.failed || result.blocked || result.compensationRequired) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "saga_risk_detected",
      category: "reputation",
      severity: result.compensationRequired ? "negative_medium" : "negative_small",
      sourceEventId:
        result.sagaFailedEvent?.eventId ?? result.sagaCompensationRequiredEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        sagaId: result.sagaId,
        sagaType: result.sagaType,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromSagaResult(result: SagaEvaluationResult): UValueImpactEvent | null {
  if (result.completed) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "saga_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.sagaCompletedEvent?.eventId ?? null,
      confidence: result.completionConfidenceScore,
      metadata: {
        sagaId: result.sagaId,
        sagaType: result.sagaType
      }
    });
  }

  if (result.failed || result.compensationRequired) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: result.compensationRequired ? "saga_compensation_required" : "saga_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.sagaCompensationRequiredEvent?.eventId ?? result.sagaFailedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        sagaId: result.sagaId,
        sagaType: result.sagaType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
