import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import type { YieldVerificationResult } from "../../types/alphabet/yield.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromYieldVerification(
  result: YieldVerificationResult
): TrustImpactEvent | null {
  if (
    result.status === "yield_accrued" ||
    result.status === "grant_eligible" ||
    result.status === "rare_grant_candidate"
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "yield_accrued_clean",
      category: "reputation",
      severity:
        result.status === "rare_grant_candidate"
          ? "positive_medium"
          : "positive_small",
      sourceEventId:
        result.rareGrantCandidateEvent?.eventId ??
        result.grantEligibilityUpdatedEvent?.eventId ??
        result.yieldAccruedEvent?.eventId ??
        null,
      confidence: result.status === "rare_grant_candidate" ? 0.85 : 0.7,
      metadata: {
        yieldProfileId: result.yieldProfileId,
        status: result.status,
        grantTier: result.grantTier,
        yieldScore: result.yieldScore,
        grantEligibilityScore: result.grantEligibilityScore,
        moralWeightScore: result.moralWeightScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.some((reason) =>
      [
        "grant_gaming_risk_above_maximum",
        "collusion_risk_above_maximum",
        "fake_nobility_risk_above_maximum",
        "reputation_farming_risk_above_maximum"
      ].includes(reason)
    )
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "grant_gaming_detected",
      category: "reputation",
      severity: "negative_large",
      sourceEventId: result.grantGamingDetectedEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        yieldProfileId: result.yieldProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "disqualified") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "grant_disqualification",
      category: "reputation",
      severity: "negative_medium",
      sourceEventId: result.grantGamingDetectedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        yieldProfileId: result.yieldProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromYieldVerification(
  result: YieldVerificationResult
): UValueImpactEvent | null {
  if (result.status === "rare_grant_candidate") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "rare_grant_candidate_selected",
      category: "yield",
      severity: "positive_rare",
      coinCode: "Y",
      sourceEventId: result.rareGrantCandidateEvent?.eventId ?? null,
      confidence: 0.9,
      metadata: {
        yieldProfileId: result.yieldProfileId,
        grantTier: result.grantTier,
        yieldScore: result.yieldScore,
        grantEligibilityScore: result.grantEligibilityScore,
        moralWeightScore: result.moralWeightScore
      }
    });
  }

  if (result.status === "grant_eligible") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "grant_eligibility_updated",
      category: "yield",
      severity: "positive_large",
      coinCode: "Y",
      sourceEventId: result.grantEligibilityUpdatedEvent?.eventId ?? null,
      confidence: 0.85,
      metadata: {
        yieldProfileId: result.yieldProfileId,
        grantTier: result.grantTier,
        yieldScore: result.yieldScore,
        grantEligibilityScore: result.grantEligibilityScore,
        moralWeightScore: result.moralWeightScore
      }
    });
  }

  if (result.status === "yield_accrued") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "yield_accrued",
      category: "yield",
      severity: "positive_medium",
      coinCode: "Y",
      sourceEventId: result.yieldAccruedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        yieldProfileId: result.yieldProfileId,
        grantTier: result.grantTier,
        yieldScore: result.yieldScore,
        grantEligibilityScore: result.grantEligibilityScore,
        moralWeightScore: result.moralWeightScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.some((reason) =>
      [
        "grant_gaming_risk_above_maximum",
        "collusion_risk_above_maximum",
        "fake_nobility_risk_above_maximum",
        "reputation_farming_risk_above_maximum"
      ].includes(reason)
    )
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "grant_gaming_detected",
      category: "yield",
      severity: "negative_large",
      coinCode: "Y",
      sourceEventId: result.grantGamingDetectedEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        yieldProfileId: result.yieldProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
