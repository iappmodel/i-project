import type { FocusVerificationResult } from "../../types/alphabet/focus.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromFocusVerification(
  result: FocusVerificationResult
): TrustImpactEvent | null {
  if (result.status === "verified") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "attention_verified_clean",
      category: "attention",
      severity: "positive_small",
      sourceEventId: result.event.eventId,
      confidence: 0.65,
      metadata: {
        focusSessionId: result.focusSessionId,
        focusDepthScore: result.focusDepthScore,
        focusQualityScore: result.focusQualityScore,
        distractionScore: result.distractionScore,
        riskScore: result.riskScore,
        focusMultiplier: result.focusMultiplier
      }
    });
  }

  if (result.status === "suspicious" || result.reasons.includes("risk_score_above_maximum")) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "fake_attention_detected",
      category: "attention",
      severity: "negative_medium",
      sourceEventId: result.event.eventId,
      confidence: 0.55,
      metadata: {
        focusSessionId: result.focusSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromFocusVerification(
  result: FocusVerificationResult
): UValueImpactEvent | null {
  if (result.status === "verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "focus_session_verified",
      category: "focus",
      severity: "positive_medium",
      coinCode: "F",
      sourceEventId: result.event.eventId,
      confidence: 0.75,
      metadata: {
        focusSessionId: result.focusSessionId,
        focusDepthScore: result.focusDepthScore,
        focusQualityScore: result.focusQualityScore,
        distractionScore: result.distractionScore,
        riskScore: result.riskScore,
        focusMultiplier: result.focusMultiplier
      }
    });
  }

  if (result.status === "distracted") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "low_quality_farming_detected",
      category: "focus",
      severity: "negative_small",
      coinCode: "F",
      sourceEventId: result.event.eventId,
      confidence: 0.45,
      metadata: {
        focusSessionId: result.focusSessionId,
        reasons: result.reasons
      }
    });
  }

  if (result.status === "suspicious" || result.reasons.includes("risk_score_above_maximum")) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "fraud_detected",
      category: "focus",
      severity: "negative_medium",
      coinCode: "F",
      sourceEventId: result.event.eventId,
      confidence: 0.55,
      metadata: {
        focusSessionId: result.focusSessionId,
        reasons: result.reasons
      }
    });
  }

  return null;
}
