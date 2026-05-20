import type { OperationalAlertEvaluationResult } from "@/types/alphabet/operational-alert.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromOperationalAlertResult(
  result: OperationalAlertEvaluationResult
): TrustImpactEvent | null {
  if (result.shouldCreateAlert || result.shouldEscalate) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "operational_alert_created",
      category: "reputation",
      severity: result.severity === "critical" ? "negative_medium" : "negative_small",
      sourceEventId: result.operationalAlertCreatedEvent.eventId,
      confidence: result.alertSeverityScore,
      metadata: {
        alertType: result.alertType,
        alertSource: result.alertSource,
        severity: result.severity,
        priority: result.priority
      }
    });
  }

  if (result.failed) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "operational_alert_failed",
      category: "reputation",
      severity: "negative_medium",
      sourceEventId: result.operationalAlertFailedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        alertType: result.alertType,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromOperationalAlertResult(
  result: OperationalAlertEvaluationResult
): UValueImpactEvent | null {
  if (result.shouldCreateAlert || result.shouldEscalate) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "operational_alert_created",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.operationalAlertCreatedEvent.eventId,
      confidence: result.alertSeverityScore,
      metadata: {
        alertType: result.alertType,
        severity: result.severity
      }
    });
  }

  if (result.failed) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "operational_alert_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.operationalAlertFailedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        alertType: result.alertType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
