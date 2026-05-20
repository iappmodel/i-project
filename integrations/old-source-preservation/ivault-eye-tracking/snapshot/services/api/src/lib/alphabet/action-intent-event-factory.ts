import type { ActionIntentEvaluationResult } from "@/types/alphabet/action-intent.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromActionIntentResult(
  result: ActionIntentEvaluationResult
): TrustImpactEvent | null {
  if (result.ready || result.policyRequired || result.sagaRequired) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "action_intent_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.actionIntentAcceptedEvent?.eventId ??
        result.actionIntentPolicyRequestedEvent?.eventId ??
        result.actionIntentSagaRequestedEvent?.eventId ??
        null,
      confidence: result.intentLegitimacyScore,
      metadata: {
        actionIntentId: result.actionIntentId,
        intentType: result.intentType,
        status: result.status
      }
    });
  }

  if (result.rejected || result.duplicate || result.expired) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "action_intent_risk_detected",
      category: "reputation",
      severity: "negative_small",
      sourceEventId:
        result.actionIntentRejectedEvent?.eventId ??
        result.actionIntentExpiredEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        actionIntentId: result.actionIntentId,
        intentType: result.intentType,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromActionIntentResult(
  result: ActionIntentEvaluationResult
): UValueImpactEvent | null {
  if (result.ready) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "action_intent_accepted",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.actionIntentAcceptedEvent?.eventId ?? null,
      confidence: result.routingReadinessScore,
      metadata: {
        actionIntentId: result.actionIntentId,
        intentType: result.intentType
      }
    });
  }

  if (result.rejected || result.duplicate || result.expired) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: result.expired ? "action_intent_expired" : "action_intent_rejected",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.actionIntentExpiredEvent?.eventId ??
        result.actionIntentRejectedEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        actionIntentId: result.actionIntentId,
        intentType: result.intentType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
