import type { HelpVerificationResult } from "../../types/alphabet/help.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromHelpVerification(
  result: HelpVerificationResult
): TrustImpactEvent | null {
  if (result.status === "help_verified" || result.status === "noble_action_verified") {
    return createTrustImpactEvent({
      userId: result.helperUserId,
      eventType: "valid_safety_report",
      category: "safety",
      severity: result.status === "noble_action_verified" ? "positive_medium" : "positive_small",
      sourceEventId: result.hCoinEvent?.eventId ?? result.helpCompletedEvent.eventId,
      confidence: result.status === "noble_action_verified" ? 0.85 : 0.7,
      metadata: {
        helpSessionId: result.helpSessionId,
        recipientUserId: result.recipientUserId,
        helpScore: result.helpScore,
        outcomeScore: result.outcomeScore,
        nobilityScore: result.nobilityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    (result.reasons.includes("collusion_risk_above_maximum") ||
      result.reasons.includes("fake_recipient_risk_above_maximum"))
  ) {
    return createTrustImpactEvent({
      userId: result.helperUserId,
      eventType: "task_fraud_detected",
      category: "work",
      severity: "negative_large",
      sourceEventId: result.helpCompletedEvent.eventId,
      confidence: 0.7,
      metadata: {
        helpSessionId: result.helpSessionId,
        recipientUserId: result.recipientUserId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("harassment_risk_above_maximum")
  ) {
    return createTrustImpactEvent({
      userId: result.helperUserId,
      eventType: "harassment_confirmed",
      category: "safety",
      severity: "negative_large",
      sourceEventId: result.helpCompletedEvent.eventId,
      confidence: 0.75,
      metadata: {
        helpSessionId: result.helpSessionId,
        recipientUserId: result.recipientUserId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromHelpVerification(
  result: HelpVerificationResult
): UValueImpactEvent | null {
  if (result.status === "noble_action_verified") {
    return createUValueImpactEvent({
      userId: result.helperUserId,
      eventType: "noble_action_verified",
      category: "nobility",
      severity: "positive_rare",
      coinCode: "N",
      sourceEventId: result.nCoinEvent?.eventId ?? result.hCoinEvent?.eventId ?? null,
      confidence: 0.9,
      metadata: {
        helpSessionId: result.helpSessionId,
        recipientUserId: result.recipientUserId,
        helpScore: result.helpScore,
        outcomeScore: result.outcomeScore,
        nobilityScore: result.nobilityScore
      }
    });
  }

  if (result.status === "help_verified") {
    return createUValueImpactEvent({
      userId: result.helperUserId,
      eventType: "help_verified",
      category: "help",
      severity: "positive_large",
      coinCode: "H",
      sourceEventId: result.hCoinEvent?.eventId ?? result.helpCompletedEvent.eventId,
      confidence: 0.8,
      metadata: {
        helpSessionId: result.helpSessionId,
        recipientUserId: result.recipientUserId,
        helpScore: result.helpScore,
        outcomeScore: result.outcomeScore,
        nobilityScore: result.nobilityScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    (result.reasons.includes("collusion_risk_above_maximum") ||
      result.reasons.includes("fake_recipient_risk_above_maximum"))
  ) {
    return createUValueImpactEvent({
      userId: result.helperUserId,
      eventType: "fraud_detected",
      category: "help",
      severity: "negative_large",
      coinCode: "H",
      sourceEventId: result.helpCompletedEvent.eventId,
      confidence: 0.7,
      metadata: {
        helpSessionId: result.helpSessionId,
        recipientUserId: result.recipientUserId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("harassment_risk_above_maximum")
  ) {
    return createUValueImpactEvent({
      userId: result.helperUserId,
      eventType: "harassment_confirmed",
      category: "safety",
      severity: "negative_severe",
      coinCode: "H",
      sourceEventId: result.helpCompletedEvent.eventId,
      confidence: 0.75,
      metadata: {
        helpSessionId: result.helpSessionId,
        recipientUserId: result.recipientUserId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
