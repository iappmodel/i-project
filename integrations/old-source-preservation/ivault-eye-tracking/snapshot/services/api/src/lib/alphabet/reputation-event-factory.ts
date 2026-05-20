import type { ReputationVerificationResult } from "../../types/alphabet/reputation.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromReputationVerification(
  result: ReputationVerificationResult
): TrustImpactEvent | null {
  if (
    result.status === "reputation_verified" ||
    result.status === "identity_strengthened" ||
    result.status === "credible_profile"
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "identity_verified",
      category: "identity",
      severity:
        result.status === "reputation_verified"
          ? "positive_medium"
          : "positive_small",
      sourceEventId:
        result.reputationVerifiedEvent?.eventId ??
        result.identityStrengthenedEvent?.eventId ??
        result.profileCredibilityUpdatedEvent.eventId,
      confidence: result.status === "reputation_verified" ? 0.85 : 0.7,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        identityStrengthScore: result.identityStrengthScore,
        reputationScore: result.reputationScore,
        credibilityScore: result.credibilityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("impersonation_risk_above_maximum")
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "impersonation_detected",
      category: "identity",
      severity: "negative_large",
      sourceEventId:
        result.impersonationRiskEvent?.eventId ??
        result.profileCredibilityUpdatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("synthetic_identity_risk_above_maximum")
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "synthetic_identity_detected",
      category: "identity",
      severity: "negative_large",
      sourceEventId:
        result.syntheticIdentityRiskEvent?.eventId ??
        result.profileCredibilityUpdatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "restricted") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "ban_evasion_detected",
      category: "identity",
      severity: "negative_severe",
      sourceEventId: result.profileCredibilityUpdatedEvent.eventId,
      confidence: 0.85,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromReputationVerification(
  result: ReputationVerificationResult
): UValueImpactEvent | null {
  if (result.status === "reputation_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "reputation_verified",
      category: "reputation",
      severity: "positive_large",
      coinCode: "R",
      sourceEventId: result.reputationVerifiedEvent?.eventId ?? null,
      confidence: 0.85,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        identityStrengthScore: result.identityStrengthScore,
        reputationScore: result.reputationScore,
        credibilityScore: result.credibilityScore
      }
    });
  }

  if (
    result.status === "identity_strengthened" ||
    result.status === "credible_profile"
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "identity_strengthened",
      category: "identity",
      severity: "positive_medium",
      coinCode: "I",
      sourceEventId:
        result.identityStrengthenedEvent?.eventId ??
        result.profileCredibilityUpdatedEvent.eventId,
      confidence: 0.75,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        identityStrengthScore: result.identityStrengthScore,
        reputationScore: result.reputationScore,
        credibilityScore: result.credibilityScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("impersonation_risk_above_maximum")
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "impersonation_detected",
      category: "identity",
      severity: "negative_large",
      coinCode: "R",
      sourceEventId:
        result.impersonationRiskEvent?.eventId ??
        result.profileCredibilityUpdatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("synthetic_identity_risk_above_maximum")
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "synthetic_identity_detected",
      category: "identity",
      severity: "negative_large",
      coinCode: "R",
      sourceEventId:
        result.syntheticIdentityRiskEvent?.eventId ??
        result.profileCredibilityUpdatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        reputationProfileId: result.reputationProfileId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
