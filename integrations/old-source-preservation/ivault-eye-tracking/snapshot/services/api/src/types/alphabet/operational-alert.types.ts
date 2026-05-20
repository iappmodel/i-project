import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type OperationalAlertType =
  | "provider_unknown_without_review"
  | "provider_failure_without_compensation"
  | "compensation_completed_without_reversal"
  | "ledger_without_execution"
  | "reversal_without_original"
  | "external_transfer_success_without_debit"
  | "worker_dead_lettered"
  | "idempotency_conflict_spike"
  | "dedupe_duplicate_spike"
  | "payout_stuck_pending"
  | "review_sla_breached"
  | "audit_risk_high"
  | "wallet_negative_balance"
  | "campaign_budget_invariant_broken"
  | "suspicious_reward_velocity"
  | "fraud_freeze_recommended";

export type OperationalAlertSource =
  | "system_timeline"
  | "provider_reconciliation"
  | "external_transfer"
  | "compensation"
  | "ledger"
  | "wallet"
  | "worker"
  | "admin_review"
  | "trust_engine"
  | "fraud_engine"
  | "scheduled_scanner";

export type OperationalAlertStatus =
  | "alert_created"
  | "alert_open"
  | "alert_acknowledged"
  | "alert_investigating"
  | "alert_escalated"
  | "alert_resolved"
  | "alert_dismissed"
  | "alert_suppressed"
  | "alert_failed";

export type OperationalAlertSeverity = "low" | "medium" | "high" | "critical";
export type OperationalAlertPriority = "low" | "normal" | "high" | "urgent";

export type OperationalAlertTeam =
  | "payments"
  | "fraud"
  | "trust_safety"
  | "wallet_ops"
  | "creator_ops"
  | "infra"
  | "legal"
  | "policy";

export type OperationalAlertOutcomeStatus =
  | "alert_create"
  | "alert_skip_duplicate"
  | "alert_suppress"
  | "alert_escalate"
  | "alert_fail";

export interface OperationalAlertLinkedObjectIds {
  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  ledgerEntryId?: string | null;
  originalLedgerEntryId?: string | null;
  reversalLedgerEntryId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  providerReconciliationId?: string | null;
  reviewCaseId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  campaignId?: string | null;
  notificationId?: string | null;
  auditRecordId?: string | null;
  alphabetEventId?: string | null;
}

export interface OperationalAlertRiskScores {
  alertConfidenceScore: number;
  financialRiskScore: number;
  userImpactScore: number;
  platformRiskScore: number;
  exploitabilityScore: number;
  urgencyScore: number;
  recurrenceRiskScore: number;
}

export interface OperationalAlertSignalInput {
  alertType: OperationalAlertType;
  alertSource: OperationalAlertSource;

  linkedObjectIds: OperationalAlertLinkedObjectIds;

  sourceAnomalyIds: string[];
  sourceEventIds: string[];

  evidence: Json;
  redactedEvidence: Json;

  publicSummary?: string | null;
  internalSummary?: string | null;

  riskScores: OperationalAlertRiskScores;

  existingOpenAlertCount: number;
  suppressRequested: boolean;

  now: string;
  metadata?: Json;
}

export interface OperationalAlertRuleSet {
  alertType: OperationalAlertType;

  defaultSeverity: OperationalAlertSeverity;
  defaultPriority: OperationalAlertPriority;
  defaultTeam: OperationalAlertTeam;

  createReviewCase: boolean;
  suppressDuplicates: boolean;
  autoSuppressBelowSeverityScore: number;

  minAlertConfidenceScore: number;
  minAlertSeverityScore: number;
  minRoutingScore: number;

  criticalSeverityScore: number;
  highSeverityScore: number;
  mediumSeverityScore: number;

  urgentPriorityScore: number;
  highPriorityScore: number;
  normalPriorityScore: number;

  active: boolean;
}

export interface OperationalAlertEvaluationResult {
  status: OperationalAlertOutcomeStatus;

  alertType: OperationalAlertType;
  alertSource: OperationalAlertSource;

  severity: OperationalAlertSeverity;
  priority: OperationalAlertPriority;

  assignedTeam: OperationalAlertTeam;
  routeReason: string;

  alertSeverityScore: number;
  alertPriorityScore: number;
  routingScore: number;
  duplicateAlertRisk: number;

  shouldCreateAlert: boolean;
  shouldSkipDuplicate: boolean;
  shouldSuppress: boolean;
  shouldEscalate: boolean;
  failed: boolean;

  shouldCreateReviewCase: boolean;

  idempotencyKey: string;
  dedupeKey: string;

  reasons: string[];

  operationalAlertCreatedEvent: AlphabetEvent;
  operationalAlertRoutedEvent?: AlphabetEvent | null;
  operationalAlertSuppressedEvent?: AlphabetEvent | null;
  operationalAlertFailedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface OperationalAlertRecordView {
  alertId: string;
  alertType: OperationalAlertType;
  alertSource: OperationalAlertSource;
  status: OperationalAlertStatus;
  severity: OperationalAlertSeverity;
  priority: OperationalAlertPriority;
  assignedTeam?: OperationalAlertTeam | null;
  assignedUserId?: string | null;
  routeReason?: string | null;
  linkedObjectIds: OperationalAlertLinkedObjectIds;
  publicSummary?: string | null;
  internalSummary?: string | null;
  redactedEvidence: Json;
  riskScores: OperationalAlertRiskScores | Json;
  createdAt: string;
  updatedAt: string;
}
