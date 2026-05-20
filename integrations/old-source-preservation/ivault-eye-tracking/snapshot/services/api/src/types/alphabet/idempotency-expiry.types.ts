import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type IdempotencyExpiryType =
  | "idempotency_key_expired"
  | "idempotency_key_stale"
  | "idempotency_key_conflict_spike"
  | "idempotency_key_replay_spike"
  | "idempotency_key_missing_result"
  | "idempotency_key_result_mismatch"
  | "idempotency_key_locked_too_long"
  | "dedupe_key_expired"
  | "dedupe_key_stale"
  | "dedupe_duplicate_spike"
  | "dedupe_replay_spike"
  | "dedupe_key_missing_object"
  | "dedupe_key_locked_too_long";

export type IdempotencyExpiryScope = "idempotency" | "dedupe" | "combined";

export type IdempotencyExpiryStatus =
  | "expiry_passed"
  | "expiry_archived"
  | "expiry_suppressed"
  | "expiry_warning"
  | "expiry_failed"
  | "expiry_critical"
  | "expiry_skipped";

export type IdempotencyExpirySeverity = "info" | "warning" | "danger" | "critical";

export type IdempotencyExpiryOutcome =
  | "expiry_pass"
  | "expiry_archive"
  | "expiry_suppress"
  | "expiry_warn"
  | "expiry_fail"
  | "expiry_critical"
  | "expiry_skip";

export type IdempotencyKeyType = "idempotency" | "dedupe";

export interface IdempotencyExpiryLinkedObjectIds {
  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  ledgerEntryId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  reviewCaseId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  notificationId?: string | null;
  alphabetEventId?: string | null;
}

export interface IdempotencyExpiryKeyMetadata {
  keyId?: string | null;
  keyType: IdempotencyKeyType;
  scope?: string | null;
  keyValue?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  status?: string | null;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  expiresAt?: string | null;
  lockedAt?: string | null;
  lockExpiresAt?: string | null;
  hitCount: number;
  conflictCount: number;
  replayCount: number;
}

export interface IdempotencyExpiryDecisions {
  shouldArchive: boolean;
  shouldSuppress: boolean;
  shouldAlert: boolean;
  shouldReview: boolean;
  shouldExpireLock: boolean;
}

export interface IdempotencyExpiryRiskScores {
  conflictRiskScore: number;
  replayRiskScore: number;
  abuseRiskScore: number;
  financialRiskScore: number;
  auditPreservationScore: number;
  confidenceScore: number;
}

export interface IdempotencyExpirySignalInput {
  expiryType: IdempotencyExpiryType;
  expiryScope: IdempotencyExpiryScope;

  keyMetadata: IdempotencyExpiryKeyMetadata;
  linkedObjectIds: IdempotencyExpiryLinkedObjectIds;

  riskScores: IdempotencyExpiryRiskScores;

  evidence: Json;
  redactedEvidence: Json;

  sourceEventIds: string[];

  expired: boolean;
  stale: boolean;
  conflictSpike: boolean;
  replaySpike: boolean;
  duplicateSpike: boolean;
  missingResult: boolean;
  resultMismatch: boolean;
  lockExpired: boolean;
  moneyScoped: boolean;
  auditCritical: boolean;

  now: string;
  metadata?: Json;
}

export interface IdempotencyExpiryRuleSet {
  expiryType: IdempotencyExpiryType;

  defaultSeverity: IdempotencyExpirySeverity;

  archiveSafeExpired: boolean;
  suppressDuplicateExpired: boolean;
  createsOperationalAlert: boolean;
  createsReviewCase: boolean;

  minConfidenceScore: number;
  warnSeverityScore: number;
  failSeverityScore: number;
  criticalSeverityScore: number;

  active: boolean;
}

export interface IdempotencyExpiryEvaluationResult {
  status: IdempotencyExpiryOutcome;
  dbStatus: IdempotencyExpiryStatus;

  expiryType: IdempotencyExpiryType;
  expiryScope: IdempotencyExpiryScope;

  severity: IdempotencyExpirySeverity;

  expirySeverityScore: number;
  expiryConfidenceScore: number;

  passed: boolean;
  archived: boolean;
  suppressed: boolean;
  warning: boolean;
  failed: boolean;
  critical: boolean;
  skipped: boolean;

  decisions: IdempotencyExpiryDecisions;

  reasons: string[];

  startedEvent: AlphabetEvent;
  archivedEvent?: AlphabetEvent | null;
  suppressedEvent?: AlphabetEvent | null;
  warningEvent?: AlphabetEvent | null;
  failedEvent?: AlphabetEvent | null;
  criticalEvent?: AlphabetEvent | null;
  completedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface IdempotencyExpiryScannerResult {
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
