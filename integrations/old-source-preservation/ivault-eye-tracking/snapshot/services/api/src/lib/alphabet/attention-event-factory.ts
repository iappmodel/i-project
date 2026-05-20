import type { AttentionVerificationResult } from "../../types/alphabet/attention.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromAttentionVerification(
  result: AttentionVerificationResult
): TrustImpactEvent | null {
  if (result.status === "verified") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "attention_verified_clean",
      category: "attention",
      severity: "positive_small",
      sourceEventId: result.event.eventId,
      confidence: 0.75,
      metadata: {
        attentionSessionId: result.attentionSessionId,
        rawAttentionScore: result.rawAttentionScore,
        qualityScore: result.qualityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "rejected" &&
    (result.reasons.includes("risk_score_above_maximum") ||
      result.reasons.includes("replay_loop_detected"))
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "fake_attention_detected",
      category: "attention",
      severity: "negative_medium",
      sourceEventId: result.event.eventId,
      confidence: 0.65,
      metadata: {
        attentionSessionId: result.attentionSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromAttentionVerification(
  result: AttentionVerificationResult
): UValueImpactEvent | null {
  if (result.status === "verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "attention_verified",
      category: "attention",
      severity: "positive_small",
      coinCode: "A",
      sourceEventId: result.event.eventId,
      confidence: 0.7,
      metadata: {
        attentionSessionId: result.attentionSessionId,
        rawAttentionScore: result.rawAttentionScore,
        qualityScore: result.qualityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "rejected" &&
    (result.reasons.includes("risk_score_above_maximum") ||
      result.reasons.includes("replay_loop_detected"))
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "fraud_detected",
      category: "attention",
      severity: "negative_medium",
      coinCode: "A",
      sourceEventId: result.event.eventId,
      confidence: 0.6,
      metadata: {
        attentionSessionId: result.attentionSessionId,
        reasons: result.reasons
      }
    });
  }

  return null;
}
