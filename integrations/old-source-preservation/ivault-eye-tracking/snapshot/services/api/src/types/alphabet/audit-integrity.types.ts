import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type AuditIntegrityGapCategory =
  | "ledger"
  | "reversal"
  | "transfer"
  | "compensation"
  | "provider"
  | "reconciliation_report"
  | "scheduled_job"
  | "alphabet_event"
  | "trust_evidence"
  | "chain"
  | "other";

export type AuditIntegrityGapSeverity = "low" | "medium" | "high" | "critical";

export interface AuditIntegrityGap {
  gapType: string;
  category: AuditIntegrityGapCategory;
  severity: AuditIntegrityGapSeverity;
  objectRef: Record<string, unknown>;
  explanation: string;
}

export interface AuditIntegrityWindowBundle {
  periodStart: string;
  periodEnd: string;
  reportDate: string;
  reportScope: string;
  ledgers: Array<Record<string, unknown>>;
  auditRecords: Array<Record<string, unknown>>;
  externalTransfers: Array<Record<string, unknown>>;
  compensationRecords: Array<Record<string, unknown>>;
  providerReconciliations: Array<Record<string, unknown>>;
  financialReconciliationReports: Array<Record<string, unknown>>;
  alphabetEventIds: Set<string>;
}

export interface AuditIntegrityScanResult {
  gaps: AuditIntegrityGap[];
  breakdown: Record<string, number>;
  scannedObjectCounts: Record<string, number>;
}

export interface AuditIntegrityEvaluationResult {
  status: "report_clean" | "report_warning" | "report_failed" | "report_critical";
  severity: "info" | "warning" | "danger" | "critical";
  gapCount: number;
  criticalGapCount: number;
  ledgerGapCount: number;
  reversalGapCount: number;
  transferGapCount: number;
  compensationGapCount: number;
  providerGapCount: number;
  reconciliationReportGapCount: number;
  scheduledJobGapCount: number;
  alphabetEventGapCount: number;
  trustEvidenceGapCount: number;
  chainBreakGapCount: number;
  riskScore: number;
  complianceScore: number;
  trustScore: number;
  safetyScore: number;
  reasonCodes: string[];
  shouldCreateOperationalAlert: boolean;
  shouldCreateReviewCase: boolean;
  auditIntegrityScanStartedEvent: AlphabetEvent;
  auditIntegrityCleanEvent: AlphabetEvent | null;
  auditIntegrityWarningEvent: AlphabetEvent | null;
  auditIntegrityFailedEvent: AlphabetEvent | null;
  auditIntegrityCriticalEvent: AlphabetEvent | null;
  auditIntegrityCompletedEvent: AlphabetEvent | null;
  auditIntegrityScanCompletedEvent: AlphabetEvent;
  metadata: Json;
}

export interface AuditIntegrityDailyRunParams {
  reportDate: string;
  reportScope?: string;
  periodStart: string;
  periodEnd: string;
}

export interface AuditIntegrityDailyRunResult {
  ok: boolean;
  resultPayload: Json;
  errorPayload?: Json | null;
  scannedObjectCounts: Record<string, number>;
  mutationCounts: Record<string, number>;
  sourceEventIds: string[];
  createdAlertIds: string[];
  createdReviewCaseIds: string[];
  reasonCodes: string[];
  retryable: boolean;
}
