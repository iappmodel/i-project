import type { GrantEvaluationResult } from "../../types/alphabet/grant.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromGrantResult(
  result: GrantEvaluationResult
): TrustImpactEvent | null {
  if (result.issueAuthorized || result.approved) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "grant_positive_outcome",
      category: "reputation",
      severity: "positive_medium",
      sourceEventId:
        result.grantIssuedEvent?.eventId ??
        result.grantApprovedEvent?.eventId ??
        result.grantEligibleEvent?.eventId ??
        null,
      confidence: result.grantEligibilityScore,
      metadata: {
        grantEligibilityId: result.grantEligibilityId,
        grantType: result.grantType,
        status: result.status,
        grantAmount: result.grantAmount,
        secrecyMode: result.secrecyMode
      }
    });
  }

  if (result.status === "grant_rejected" || result.grantRiskDetectedEvent) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "grant_risk_or_rejection",
      category: "reputation",
      severity: "negative_small",
      sourceEventId:
        result.grantRiskDetectedEvent?.eventId ??
        result.grantRejectedEvent?.eventId ??
        result.grantEligibilityCreatedEvent.eventId,
      confidence: 0.7,
      metadata: {
        grantEligibilityId: result.grantEligibilityId,
        grantType: result.grantType,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromGrantResult(
  result: GrantEvaluationResult
): UValueImpactEvent | null {
  if (result.issueAuthorized) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "grant_issued",
      category: "economic",
      severity: "positive_large",
      coinCode: result.rewardCoinCode ?? "U",
      sourceEventId: result.grantIssuedEvent?.eventId ?? null,
      confidence: result.grantEligibilityScore,
      metadata: {
        grantEligibilityId: result.grantEligibilityId,
        grantType: result.grantType,
        grantAmount: result.grantAmount,
        secrecyMode: result.secrecyMode
      }
    });
  }

  if (result.eligible || result.approved) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: result.approved ? "grant_approved" : "grant_eligible",
      category: "economic",
      severity: "positive_medium",
      coinCode: result.rewardCoinCode ?? "U",
      sourceEventId:
        result.grantApprovedEvent?.eventId ??
        result.grantEligibleEvent?.eventId ??
        null,
      confidence: result.grantEligibilityScore,
      metadata: {
        grantEligibilityId: result.grantEligibilityId,
        grantType: result.grantType,
        status: result.status
      }
    });
  }

  return null;
}
