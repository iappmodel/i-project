import type { PresenceVerificationResult } from "../../types/alphabet/presence.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromPresenceVerification(
  result: PresenceVerificationResult
): TrustImpactEvent | null {
  if (
    result.status === "presence_verified" ||
    result.status === "local_action_verified"
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "location_verified_clean",
      category: "presence",
      severity: "positive_small",
      sourceEventId:
        result.localOfferRedeemedEvent?.eventId ??
        result.localActionCompletedEvent?.eventId ??
        result.presenceVerifiedEvent?.eventId ??
        null,
      confidence: result.status === "local_action_verified" ? 0.85 : 0.75,
      metadata: {
        presenceSessionId: result.presenceSessionId,
        presenceScore: result.presenceScore,
        localActionScore: result.localActionScore,
        qualityScore: result.qualityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    (result.reasons.includes("gps_spoofing_risk_above_maximum") ||
      result.reasons.includes("impossible_travel_risk_above_maximum"))
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "gps_spoofing_detected",
      category: "presence",
      severity: "negative_large",
      sourceEventId: result.spoofingEvent?.eventId ?? result.sessionStartedEvent.eventId,
      confidence: 0.8,
      metadata: {
        presenceSessionId: result.presenceSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromPresenceVerification(
  result: PresenceVerificationResult
): UValueImpactEvent | null {
  if (result.status === "local_action_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "presence_verified",
      category: "presence",
      severity: "positive_medium",
      coinCode: "P",
      sourceEventId:
        result.localOfferRedeemedEvent?.eventId ??
        result.localActionCompletedEvent?.eventId ??
        null,
      confidence: 0.8,
      metadata: {
        presenceSessionId: result.presenceSessionId,
        presenceScore: result.presenceScore,
        localActionScore: result.localActionScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (result.status === "presence_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "presence_verified",
      category: "presence",
      severity: "positive_small",
      coinCode: "P",
      sourceEventId: result.presenceVerifiedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        presenceSessionId: result.presenceSessionId,
        presenceScore: result.presenceScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    (result.reasons.includes("gps_spoofing_risk_above_maximum") ||
      result.reasons.includes("impossible_travel_risk_above_maximum"))
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "gps_spoofing_detected",
      category: "presence",
      severity: "negative_large",
      coinCode: "P",
      sourceEventId: result.spoofingEvent?.eventId ?? result.sessionStartedEvent.eventId,
      confidence: 0.8,
      metadata: {
        presenceSessionId: result.presenceSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
