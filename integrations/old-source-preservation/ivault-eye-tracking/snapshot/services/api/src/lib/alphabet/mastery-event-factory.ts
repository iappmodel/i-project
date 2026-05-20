import type { MasteryVerificationResult } from "../../types/alphabet/mastery.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromMasteryVerification(
  result: MasteryVerificationResult
): TrustImpactEvent | null {
  if (result.status === "mastery_verified") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "learning_verified_clean",
      category: "learning",
      severity: "positive_medium",
      sourceEventId: result.masteryEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        masteryPathId: result.masteryPathId,
        masteryScore: result.masteryScore,
        durabilityScore: result.durabilityScore,
        validationScore: result.validationScore,
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
      sourceEventId: result.masteryEvent?.eventId ?? null,
      confidence: 0.65,
      metadata: {
        masteryPathId: result.masteryPathId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromMasteryVerification(
  result: MasteryVerificationResult
): UValueImpactEvent | null {
  if (result.status === "mastery_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "mastery_verified",
      category: "mastery",
      severity: "positive_large",
      coinCode: "M",
      sourceEventId: result.masteryEvent?.eventId ?? null,
      confidence: 0.85,
      metadata: {
        masteryPathId: result.masteryPathId,
        masteryScore: result.masteryScore,
        durabilityScore: result.durabilityScore,
        validationScore: result.validationScore
      }
    });
  }

  if (result.status === "emerging_mastery") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "mastery_verified",
      category: "mastery",
      severity: "positive_medium",
      coinCode: "M",
      sourceEventId: result.masteryEvent?.eventId ?? null,
      confidence: 0.45,
      metadata: {
        masteryPathId: result.masteryPathId,
        masteryScore: result.masteryScore,
        durabilityScore: result.durabilityScore,
        validationScore: result.validationScore,
        emerging: true
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
      category: "mastery",
      severity: "negative_medium",
      coinCode: "M",
      sourceEventId: result.masteryEvent?.eventId ?? null,
      confidence: 0.6,
      metadata: {
        masteryPathId: result.masteryPathId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
