import type { AuditIntegrityGapSeverity } from "@/types/alphabet/audit-integrity.types";

export const AUDIT_INTEGRITY_RULES = {
  minLedgerMovementForAudit: 0.000001,
  operationalAlertMinSeverity: "high" as AuditIntegrityGapSeverity,
  reviewCaseMinSeverity: "critical" as AuditIntegrityGapSeverity,
  warnSeverityScore: 0.35,
  failSeverityScore: 0.55,
  criticalSeverityScore: 0.75
};

export function severityRank(s: AuditIntegrityGapSeverity): number {
  switch (s) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
    default:
      return 0;
  }
}
