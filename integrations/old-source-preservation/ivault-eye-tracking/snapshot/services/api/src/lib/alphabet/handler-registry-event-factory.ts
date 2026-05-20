import type { HandlerRegistryEvaluationResult } from "../../types/alphabet/handler-registry.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromHandlerResult(
  result: HandlerRegistryEvaluationResult
): TrustImpactEvent | null {
  if (result.available || result.payloadValid || result.resultValid) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "handler_clean_validation",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.handlerAvailableEvent?.eventId ??
        result.handlerPayloadValidEvent?.eventId ??
        result.handlerResultValidEvent?.eventId ??
        null,
      confidence: result.operationalReadinessScore,
      metadata: {
        handlerDefinitionId: result.handlerDefinitionId,
        handlerName: result.handlerName,
        handlerVersion: result.handlerVersion,
        targetSystem: result.targetSystem,
        action: result.action,
        status: result.status
      }
    });
  }

  if (
    result.unavailable ||
    result.disabled ||
    result.payloadInvalid ||
    result.resultInvalid ||
    result.requiresReview
  ) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "handler_risk_detected",
      category: "reputation",
      severity: result.disabled || result.unavailable ? "negative_medium" : "negative_small",
      sourceEventId:
        result.handlerUnavailableEvent?.eventId ??
        result.handlerDisabledEvent?.eventId ??
        result.handlerPayloadInvalidEvent?.eventId ??
        result.handlerResultInvalidEvent?.eventId ??
        result.handlerRequiresReviewEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        handlerDefinitionId: result.handlerDefinitionId,
        handlerName: result.handlerName,
        targetSystem: result.targetSystem,
        action: result.action,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromHandlerResult(
  result: HandlerRegistryEvaluationResult
): UValueImpactEvent | null {
  if (result.available || result.payloadValid || result.resultValid) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "handler_validation_passed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId:
        result.handlerAvailableEvent?.eventId ??
        result.handlerPayloadValidEvent?.eventId ??
        result.handlerResultValidEvent?.eventId ??
        null,
      confidence: result.schemaValidationScore,
      metadata: {
        handlerDefinitionId: result.handlerDefinitionId,
        handlerName: result.handlerName,
        targetSystem: result.targetSystem,
        action: result.action
      }
    });
  }

  if (result.payloadInvalid || result.resultInvalid || result.disabled || result.unavailable) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "handler_validation_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.handlerPayloadInvalidEvent?.eventId ??
        result.handlerResultInvalidEvent?.eventId ??
        result.handlerDisabledEvent?.eventId ??
        result.handlerUnavailableEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        handlerDefinitionId: result.handlerDefinitionId,
        handlerName: result.handlerName,
        targetSystem: result.targetSystem,
        action: result.action,
        reasons: result.reasons
      }
    });
  }

  return null;
}
