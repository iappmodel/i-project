import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type ScheduledJobKey =
  | "provider_polling_5m"
  | "pending_payout_scan_5m"
  | "review_sla_scan_5m"
  | "operational_alert_scan_5m"
  | "stuck_saga_scan_1h"
  | "wallet_invariant_scan_1h"
  | "idempotency_expiry_1h"
  | "dedupe_expiry_1h"
  | "audit_integrity_daily"
  | "financial_reconciliation_daily"
  | "trust_fraud_review_daily";

export type ScheduledJobCategory =
  | "payments"
  | "risk"
  | "wallet"
  | "infra"
  | "audit"
  | "trust"
  | "fraud";

export type ScheduledJobStatus =
  | "job_created"
  | "job_locked"
  | "job_running"
  | "job_completed"
  | "job_failed"
  | "job_skipped"
  | "job_timed_out"
  | "job_dead_lettered";

export type ScheduledJobOutcomeStatus =
  | "job_run_allowed"
  | "job_run_blocked"
  | "job_skip_locked"
  | "job_retry_allowed"
  | "job_dead_letter"
  | "job_completed"
  | "job_failed";

export type ScheduledJobTriggerSource = "cron" | "manual_admin" | "system_replay";

export interface ScheduledJobDefinition {
  jobKey: ScheduledJobKey;
  jobCategory: ScheduledJobCategory;
  status: ScheduledJobStatus;
  intervalMinutes?: number | null;
  cronExpression?: string | null;
  maxRuntimeSeconds: number;
  lockTtlSeconds: number;
  retryLimit: number;
  retryBackoffSeconds: number;
  active: boolean;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledJobLock {
  lockKey: string;
  jobKey: ScheduledJobKey;
  lockedBy: string;
  lockedAt: string;
  lockExpiresAt: string;
  metadata: Json;
}

export interface ScheduledJobSafetyScores {
  jobReadinessScore: number;
  lockSafetyScore: number;
  executionSafetyScore: number;
  resultIntegrityScore: number;
  retrySafetyScore: number;
}

export interface ScheduledJobSignalInput {
  jobKey: ScheduledJobKey;
  jobCategory: ScheduledJobCategory;

  active: boolean;

  currentStatus: ScheduledJobStatus;

  triggerSource: ScheduledJobTriggerSource;
  triggeredByUserId?: string | null;

  lockExists: boolean;
  lockExpired: boolean;
  lockKey: string;
  lockedBy?: string | null;

  attempt: number;
  retryLimit: number;

  maxRuntimeSeconds: number;
  lockTtlSeconds: number;

  previousFailureCount: number;

  resultPayload?: Json;
  errorPayload?: Json;

  safetyScores: ScheduledJobSafetyScores;

  now: string;
  metadata?: Json;
}

export interface ScheduledJobEvaluationResult {
  status: ScheduledJobOutcomeStatus;

  jobKey: ScheduledJobKey;
  jobCategory: ScheduledJobCategory;

  shouldRun: boolean;
  shouldSkip: boolean;
  shouldRetry: boolean;
  shouldDeadLetter: boolean;
  failed: boolean;
  completed: boolean;

  lockKey: string;

  jobReadinessScore: number;
  jobExecutionSafetyScore: number;

  reasons: string[];

  scheduledJobCreatedEvent: AlphabetEvent;
  scheduledJobLockedEvent?: AlphabetEvent | null;
  scheduledJobStartedEvent?: AlphabetEvent | null;
  scheduledJobCompletedEvent?: AlphabetEvent | null;
  scheduledJobFailedEvent?: AlphabetEvent | null;
  scheduledJobSkippedEvent?: AlphabetEvent | null;
  scheduledJobTimedOutEvent?: AlphabetEvent | null;
  scheduledJobDeadLetteredEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface ScheduledJobHandlerResult {
  ok: boolean;

  resultPayload: Json;
  errorPayload?: Json | null;

  scannedObjectCounts?: Record<string, number>;
  mutationCounts?: Record<string, number>;

  sourceEventIds?: string[];
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];

  reasonCodes: string[];

  retryable: boolean;
}

export interface ScheduledJobRunResult {
  ok: boolean;
  jobRunId?: string | null;
  jobKey: ScheduledJobKey;
  status: ScheduledJobStatus | ScheduledJobOutcomeStatus;
  evaluation: ScheduledJobEvaluationResult;
  handlerResult?: ScheduledJobHandlerResult | null;
  reasonCodes: string[];
}
