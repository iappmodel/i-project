import type { PolicyDecisionResult } from "@/types/alphabet/policy.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromPolicyDecision(
  result: PolicyDecisionResult
): TrustImpactEvent | null {
  if (result.status === "allowed") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "policy_allowed_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId: result.policyAllowedEvent?.eventId ?? null,
      confidence: 0.6,
      metadata: {
        policyCheckId: result.policyCheckId,
        policyEligibilityScore: result.policyEligibilityScore,
        ageSafetyScore: result.ageSafetyScore,
        regionalComplianceScore: result.regionalComplianceScore
      }
    });
  }

  if (
    result.status === "blocked_compliance" ||
    result.status === "blocked_risk"
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType:
        result.status === "blocked_compliance"
          ? "policy_compliance_blocked"
          : "policy_risk_blocked",
      category: "safety",
      severity: "negative_medium",
      sourceEventId: result.policyBlockedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        policyCheckId: result.policyCheckId,
        status: result.status,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromPolicyDecision(
  result: PolicyDecisionResult
): UValueImpactEvent | null {
  if (result.status === "allowed_with_limits") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "policy_limited",
      category: "safety",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.policyLimitedEvent?.eventId ?? null,
      confidence: 0.6,
      metadata: {
        policyCheckId: result.policyCheckId,
        restrictions: {
          restrictMonetization: result.restrictMonetization,
          restrictMessaging: result.restrictMessaging,
          restrictWithdrawal: result.restrictWithdrawal,
          restrictLocalPresence: result.restrictLocalPresence,
          restrictContentExposure: result.restrictContentExposure
        }
      }
    });
  }

  if (result.blockAction) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "policy_blocked",
      category: "safety",
      severity: "negative_medium",
      coinCode: "J",
      sourceEventId: result.policyBlockedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        policyCheckId: result.policyCheckId,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}
