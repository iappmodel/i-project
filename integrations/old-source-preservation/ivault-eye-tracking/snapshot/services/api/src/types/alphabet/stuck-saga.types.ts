import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type StuckSagaType =
  | "saga_started_no_progress"
  | "saga_running_too_long"
  | "saga_partial_failure"
  | "saga_child_execution_failed"
  | "saga_child_execution_dead_lettered"
  | "saga_money_debited_no_completion"
  | "saga_external_transfer_created_no_polling"
  | "pipeline_locked_too_long"
  | "pipeline_running_too_long"
  | "execution_running_too_long"
  | "execution_retry_exhausted"
  | "execution_dead_lettered_unreviewed"
  | "execution_money_mutation_uncertain"
  | "provider_polling_missing_after_transfer"
  | "orphan_execution_request"
  | "orphan_external_transfer";

export type StuckSagaSeverity =
  | "info"
  | "warning"
  | "danger"
  | "critical";

export type StuckSagaResultStatus =
  | "stuck_saga_passed"
  | "stuck_saga_warning"
  | "stuck_saga_failed"
  | "stuck_saga_critical"
  | "stuck_saga_skipped";

export type StuckSagaOutcomeStatus =
  | "stuck_saga_pass"
  | "stuck_saga_warn"
  | "stuck_saga_fail"
  | "stuck_saga_critical"
  | "stuck_saga_skip";

export type StuckSagaScanScope =
  | "global_batch"
  | "single_saga"
  | "single_pipeline"
  | "single_execution"
  | "single_external_transfer";

export interface StuckSagaLinkedObjectIds {
  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;

  sagaId?: string | null;
  pipelineId?: string | null;
  executionRequestId?: string | null;
  policyDecisionId?: string | null;

  ledgerEntryId?: string | null;
  externalTransferId?: string | null;
  providerReconciliationId?: string | null;
  compensationId?: string | null;
  reviewCaseId?: string | null;
}

export interface StuckSagaTiming {
  startedAt?: string | null;
  updatedAt?: string | null;
  lastProgressAt?: string | null;

  ageSeconds: number;
  staleSeconds: number;

  maxAllowedAgeSeconds: number;
  maxAllowedStaleSeconds: number;
}

export interface StuckSagaMoneyExposure {
  internalDebitAmount: number;
  externalTransferAmount: number;
  pendingAmount: number;
  unknownAmount: number;
  compensationAmount: number;
  exposureAmount: number;
}

export interface StuckSagaRiskScores {
  orchestrationRiskScore: number;
  financialExposureScore: number;
  userImpactScore: number;
  platformImpactScore: number;
  retryExhaustionScore: number;
  uncertaintyScore: number;
  confidenceScore: number;
}

export interface StuckSagaSignalInput {
  stuckType: StuckSagaType;
  scanScope: StuckSagaScanScope;

  linkedObjectIds: StuckSagaLinkedObjectIds;

  timing: StuckSagaTiming;
  moneyExposure: StuckSagaMoneyExposure;
  riskScores: StuckSagaRiskScores;

  evidence: Json;
  redactedEvidence: Json;

  sourceEventIds: string[];

  stuckDetected: boolean;
  moneyMovementAffected: boolean;
  providerAffected: boolean;
  userVisibleAffected: boolean;
  retryExhausted: boolean;
  reviewAlreadyExists: boolean;

  now: string;
  metadata?: Json;
}

export interface StuckSagaRuleSet {
  stuckType: StuckSagaType;

  defaultSeverity: StuckSagaSeverity;

  createsOperationalAlert: boolean;
  createsReviewCase: boolean;

  maxAgeSeconds: number;
  maxStaleSeconds: number;

  minConfidenceScore: number;
  warnSeverityScore: number;
  failSeverityScore: number;
  criticalSeverityScore: number;

  active: boolean;
}

export interface StuckSagaEvaluationResult {
  status: StuckSagaOutcomeStatus;
  dbStatus: StuckSagaResultStatus;

  stuckType: StuckSagaType;
  scanScope: StuckSagaScanScope;

  severity: StuckSagaSeverity;

  stuckSeverityScore: number;
  stuckConfidenceScore: number;

  passed: boolean;
  warning: boolean;
  failed: boolean;
  critical: boolean;
  skipped: boolean;

  shouldCreateOperationalAlert: boolean;
  shouldCreateReviewCase: boolean;

  reasons: string[];

  stuckSagaScanStartedEvent: AlphabetEvent;
  stuckSagaPassedEvent?: AlphabetEvent | null;
  stuckSagaWarningEvent?: AlphabetEvent | null;
  stuckSagaFailedEvent?: AlphabetEvent | null;
  stuckSagaCriticalEvent?: AlphabetEvent | null;
  stuckSagaScanCompletedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface StuckSagaScannerResult {
  ok: boolean;
  resultPayload: Json;
  scannedObjectCounts: Record<string, number>;
  mutationCounts: Record<string, number>;
  sourceEventIds: string[];
  createdAlertIds: string[];
  createdReviewCaseIds: string[];
  reasonCodes: string[];
  retryable: boolean;
}
