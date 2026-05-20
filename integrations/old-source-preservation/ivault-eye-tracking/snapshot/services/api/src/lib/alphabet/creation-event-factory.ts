import type { CreationVerificationResult } from "../../types/alphabet/creation.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromCreationVerification(
  result: CreationVerificationResult
): TrustImpactEvent | null {
  if (
    result.status === "creation_verified" ||
    result.status === "originality_verified" ||
    result.status === "quality_verified"
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "creation_rights_verified",
      category: "creation",
      severity: "positive_medium",
      sourceEventId: result.cCoinEvent?.eventId ?? result.submittedEvent.eventId,
      confidence: 0.75,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        creationScore: result.creationScore,
        finalOriginalityScore: result.finalOriginalityScore,
        finalQualityScore: result.finalQualityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    (result.reasons.includes("plagiarism_risk_above_maximum") ||
      result.reasons.includes("copyright_risk_above_maximum"))
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: result.reasons.includes("copyright_risk_above_maximum")
        ? "copyright_violation_confirmed"
        : "plagiarism_detected",
      category: "creation",
      severity: "negative_large",
      sourceEventId: result.submittedEvent.eventId,
      confidence: 0.75,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("ai_spam_risk_above_maximum")
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "ai_spam_detected",
      category: "creation",
      severity: "negative_medium",
      sourceEventId: result.submittedEvent.eventId,
      confidence: 0.65,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromCreationVerification(
  result: CreationVerificationResult
): UValueImpactEvent | null {
  if (result.status === "quality_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "quality_high",
      category: "quality",
      severity: "positive_large",
      coinCode: "Q",
      sourceEventId: result.qCoinEvent?.eventId ?? result.cCoinEvent?.eventId ?? null,
      confidence: 0.85,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        creationScore: result.creationScore,
        finalOriginalityScore: result.finalOriginalityScore,
        finalQualityScore: result.finalQualityScore
      }
    });
  }

  if (result.status === "originality_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "originality_verified",
      category: "originality",
      severity: "positive_large",
      coinCode: "O",
      sourceEventId: result.oCoinEvent?.eventId ?? result.cCoinEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        creationScore: result.creationScore,
        finalOriginalityScore: result.finalOriginalityScore,
        finalQualityScore: result.finalQualityScore
      }
    });
  }

  if (result.status === "creation_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "creation_valid",
      category: "creation",
      severity: "positive_medium",
      coinCode: "C",
      sourceEventId: result.cCoinEvent?.eventId ?? result.submittedEvent.eventId,
      confidence: 0.75,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        creationScore: result.creationScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    (result.reasons.includes("plagiarism_risk_above_maximum") ||
      result.reasons.includes("copyright_risk_above_maximum"))
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "plagiarism_detected",
      category: "creation",
      severity: "negative_large",
      coinCode: "C",
      sourceEventId: result.submittedEvent.eventId,
      confidence: 0.75,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    result.reasons.includes("ai_spam_risk_above_maximum")
  ) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "ai_spam_detected",
      category: "creation",
      severity: "negative_medium",
      coinCode: "C",
      sourceEventId: result.submittedEvent.eventId,
      confidence: 0.65,
      metadata: {
        artifactId: result.artifactId,
        creatorId: result.creatorId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
