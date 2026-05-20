import type { AuditEvaluationResult } from "../../types/alphabet/audit.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromAuditResult(
  result: AuditEvaluationResult
): TrustImpactEvent | null {
  if (result.auditComplete || result.exportReady) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "audit_record_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.auditRecordCompletedEvent?.eventId ??
        result.auditExportReadyEvent?.eventId ??
        result.auditRecordCreatedEvent.eventId,
      confidence: result.auditIntegrityScore,
      metadata: {
        auditRecordId: result.auditRecordId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        auditCategory: result.auditCategory,
        status: result.status
      }
    });
  }

  if (result.escalated || result.reviewRequired || result.exportBlocked) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "audit_record_risk_detected",
      category: "reputation",
      severity: result.escalated ? "negative_medium" : "negative_small",
      sourceEventId:
        result.auditEscalatedEvent?.eventId ??
        result.auditReviewRequiredEvent?.eventId ??
        result.auditExportBlockedEvent?.eventId ??
        result.auditRecordCreatedEvent.eventId,
      confidence: 0.75,
      metadata: {
        auditRecordId: result.auditRecordId,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        auditCategory: result.auditCategory,
        status: result.status,
        reasons: result.reasons,
        complianceRiskScore: result.complianceRiskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromAuditResult(
  result: AuditEvaluationResult
): UValueImpactEvent | null {
  if (result.auditComplete || result.exportReady) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "audit_record_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId:
        result.auditRecordCompletedEvent?.eventId ??
        result.auditExportReadyEvent?.eventId ??
        null,
      confidence: result.auditIntegrityScore,
      metadata: {
        auditRecordId: result.auditRecordId,
        auditCategory: result.auditCategory,
        status: result.status
      }
    });
  }

  if (result.escalated || result.exportBlocked) {
    return createUValueImpactEvent({
      userId: "system",
      eventType:
        result.escalated ? "audit_record_escalated" : "audit_export_blocked",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.auditEscalatedEvent?.eventId ??
        result.auditExportBlockedEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        auditRecordId: result.auditRecordId,
        auditCategory: result.auditCategory,
        reasons: result.reasons,
        complianceRiskScore: result.complianceRiskScore
      }
    });
  }

  return null;
}
