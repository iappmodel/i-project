import type { PolicyOrchestratorEvaluationResult } from "../../types/alphabet/policy-orchestrator.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromPolicyResult(
  result: PolicyOrchestratorEvaluationResult
): TrustImpactEvent | null {
  if (result.allowed || result.limited) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "policy_clean_decision",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.policyAllowedEvent?.eventId ?? result.policyLimitedEvent?.eventId ?? null,
      confidence: result.actionSafetyScore,
      metadata: {
        policyDecisionId: result.policyDecisionId,
        actionType: result.actionType,
        status: result.status,
        decision: result.decision
      }
    });
  }

  if (result.blocked || result.escalated || result.failedGates.length > 0) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "policy_risk_detected",
      category: "safety",
      severity:
        result.escalated || result.blocked ? "negative_medium" : "negative_small",
      sourceEventId:
        result.policyGateFailedEvent?.eventId ??
        result.policyBlockedEvent?.eventId ??
        result.policyEscalatedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        policyDecisionId: result.policyDecisionId,
        actionType: result.actionType,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromPolicyResult(
  result: PolicyOrchestratorEvaluationResult
): UValueImpactEvent | null {
  if (result.allowed) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "policy_allowed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.policyAllowedEvent?.eventId ?? null,
      confidence: result.actionSafetyScore,
      metadata: {
        policyDecisionId: result.policyDecisionId,
        actionType: result.actionType
      }
    });
  }

  if (result.limited) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "policy_limited",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.policyLimitedEvent?.eventId ?? null,
      confidence: result.actionSafetyScore,
      metadata: {
        policyDecisionId: result.policyDecisionId,
        actionType: result.actionType,
        reasons: result.reasons
      }
    });
  }

  if (result.blocked || result.escalated) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: result.escalated ? "policy_escalated" : "policy_blocked",
      category: "safety",
      severity: "negative_medium",
      coinCode: "J",
      sourceEventId:
        result.policyEscalatedEvent?.eventId ?? result.policyBlockedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        policyDecisionId: result.policyDecisionId,
        actionType: result.actionType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
