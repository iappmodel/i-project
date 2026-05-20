import type { GrowthVerificationResult } from "../../types/alphabet/growth.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromGrowthVerification(
  result: GrowthVerificationResult
): TrustImpactEvent | null {
  if (result.status === "growth_verified") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "learning_verified_clean",
      category: "learning",
      severity: "positive_small",
      sourceEventId: result.growthEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        growthSessionId: result.growthSessionId,
        improvementDelta: result.improvementDelta,
        normalizedGrowth: result.normalizedGrowth,
        growthScore: result.growthScore,
        qualityScore: result.qualityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" ||
    result.reasons.includes("risk_score_above_maximum")
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "quiz_cheating_detected",
      category: "learning",
      severity: "negative_medium",
      sourceEventId: result.growthEvent?.eventId ?? null,
      confidence: 0.6,
      metadata: {
        growthSessionId: result.growthSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromGrowthVerification(
  result: GrowthVerificationResult
): UValueImpactEvent | null {
  if (result.status === "growth_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "growth_verified",
      category: "growth",
      severity: "positive_medium",
      coinCode: "G",
      sourceEventId: result.growthEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        growthSessionId: result.growthSessionId,
        improvementDelta: result.improvementDelta,
        normalizedGrowth: result.normalizedGrowth,
        growthScore: result.growthScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (result.status === "small_growth") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "growth_verified",
      category: "growth",
      severity: "positive_small",
      coinCode: "G",
      sourceEventId: result.growthEvent?.eventId ?? null,
      confidence: 0.45,
      metadata: {
        growthSessionId: result.growthSessionId,
        improvementDelta: result.improvementDelta,
        normalizedGrowth: result.normalizedGrowth,
        growthScore: result.growthScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (
    result.status === "suspicious" ||
    result.reasons.includes("risk_score_above_maximum")
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "fraud_detected",
      category: "growth",
      severity: "negative_medium",
      coinCode: "G",
      sourceEventId: result.growthEvent?.eventId ?? null,
      confidence: 0.6,
      metadata: {
        growthSessionId: result.growthSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
