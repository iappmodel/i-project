import type { SafetyVerificationResult } from "../../types/alphabet/safety.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromSafetyVerification(
  result: SafetyVerificationResult
): TrustImpactEvent | null {
  if (
    result.status === "safety_contribution_verified" ||
    result.status === "judgment_verified"
  ) {
    return createTrustImpactEvent({
      userId: result.reporterUserId,
      eventType: "valid_safety_report",
      category: "safety",
      severity:
        result.status === "safety_contribution_verified"
          ? "positive_medium"
          : "positive_small",
      sourceEventId:
        result.safetyContributionEvent?.eventId ??
        result.judgmentEvent?.eventId ??
        result.reportValidatedEvent?.eventId ??
        null,
      confidence: result.status === "safety_contribution_verified" ? 0.85 : 0.7,
      metadata: {
        safetyReportId: result.safetyReportId,
        reportedUserId: result.reportedUserId ?? null,
        safetyContributionScore: result.safetyContributionScore,
        judgmentScore: result.judgmentScore,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "false_report") {
    return createTrustImpactEvent({
      userId: result.reporterUserId,
      eventType: "false_safety_report",
      category: "safety",
      severity: "negative_medium",
      sourceEventId:
        result.falseReportEvent?.eventId ?? result.reportSubmittedEvent.eventId,
      confidence: 0.8,
      metadata: {
        safetyReportId: result.safetyReportId,
        reportedUserId: result.reportedUserId ?? null,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (
    result.status === "suspicious" &&
    (result.reasons.includes("brigading_risk_above_maximum") ||
      result.reasons.includes("retaliation_risk_above_maximum"))
  ) {
    return createTrustImpactEvent({
      userId: result.reporterUserId,
      eventType: "engagement_brigading_detected",
      category: "engagement",
      severity: "negative_large",
      sourceEventId: result.reportSubmittedEvent.eventId,
      confidence: 0.7,
      metadata: {
        safetyReportId: result.safetyReportId,
        reportedUserId: result.reportedUserId ?? null,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromSafetyVerification(
  result: SafetyVerificationResult
): UValueImpactEvent | null {
  if (result.status === "safety_contribution_verified") {
    return createUValueImpactEvent({
      userId: result.reporterUserId,
      eventType: "safety_contribution_verified",
      category: "safety",
      severity: "positive_large",
      coinCode: "S",
      sourceEventId: result.safetyContributionEvent?.eventId ?? null,
      confidence: 0.85,
      metadata: {
        safetyReportId: result.safetyReportId,
        reportedUserId: result.reportedUserId ?? null,
        safetyContributionScore: result.safetyContributionScore,
        judgmentScore: result.judgmentScore
      }
    });
  }

  if (result.status === "judgment_verified") {
    return createUValueImpactEvent({
      userId: result.reporterUserId,
      eventType: "judgment_upheld",
      category: "judgment",
      severity: "positive_medium",
      coinCode: "J",
      sourceEventId: result.judgmentEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        safetyReportId: result.safetyReportId,
        reportedUserId: result.reportedUserId ?? null,
        safetyContributionScore: result.safetyContributionScore,
        judgmentScore: result.judgmentScore
      }
    });
  }

  if (result.status === "false_report") {
    return createUValueImpactEvent({
      userId: result.reporterUserId,
      eventType: "false_report_detected",
      category: "safety",
      severity: "negative_large",
      coinCode: "J",
      sourceEventId:
        result.falseReportEvent?.eventId ?? result.reportSubmittedEvent.eventId,
      confidence: 0.8,
      metadata: {
        safetyReportId: result.safetyReportId,
        reportedUserId: result.reportedUserId ?? null,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
