import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type IdempotencyScope =
  | "api_action"
  | "action_intent"
  | "policy_decision"
  | "pipeline"
  | "saga"
  | "execution_request"
  | "worker_execution"
  | "ledger_mutation"
  | "wallet_credit"
  | "wallet_debit"
  | "withdrawal"
  | "conversion"
  | "creator_payout"
  | "campaign_reserve"
  | "grant_issuance"
  | "notification"
  | "audit";

export type IdempotencyKeyStatus =
  | "new"
  | "seen"
  | "in_progress"
  | "completed"
  | "failed"
  | "expired"
  | "conflict"
  | "blocked";

export type DedupeKeyStatus =
  | "new"
  | "active"
  | "duplicate"
  | "blocked"
  | "expired"
  | "released";

export type IdempotencyOutcomeStatus =
  | "idempotency_new"
  | "idempotency_replay"
  | "idempotency_conflict"
  | "idempotency_in_progress"
  | "idempotency_expired"
  | "idempotency_blocked";

export type DedupeOutcomeStatus =
  | "dedupe_new"
  | "dedupe_active"
  | "dedupe_duplicate"
  | "dedupe_blocked"
  | "dedupe_expired"
  | "dedupe_released";

export type MutationGuardOutcomeStatus =
  | "mutation_allowed"
  | "mutation_replay"
  | "mutation_blocked_duplicate"
  | "mutation_blocked_conflict"
  | "mutation_blocked_missing_key"
  | "mutation_blocked_in_progress"
  | "mutation_blocked_expired";

export interface IdempotencyKeyRecord {
  idempotencyKey: string;
  scope: IdempotencyScope;
  status: IdempotencyKeyStatus;

  userId?: string | null;
  objectId?: string | null;

  requestHash?: string | null;
  responseSnapshot?: Json | null;

  linkedObjectIds: {
    actionIntentId?: string | null;
    policyDecisionId?: string | null;
    pipelineId?: string | null;
    sagaId?: string | null;
    executionRequestId?: string | null;
    ledgerEntryId?: string | null;
    auditRecordId?: string | null;
    notificationId?: string | null;
  };

  firstSeenAt: string;
  lastSeenAt: string;
  expiresAt?: string | null;

  metadata: Json;
}

export interface DedupeKeyRecord {
  dedupeKey: string;
  scope: IdempotencyScope;
  status: DedupeKeyStatus;

  userId?: string | null;
  objectId?: string | null;

  duplicateCount: number;

  firstSeenAt: string;
  lastSeenAt: string;
  expiresAt?: string | null;

  metadata: Json;
}

export interface IdempotencySignalInput {
  idempotencyKey?: string | null;
  scope: IdempotencyScope;

  userId?: string | null;
  objectId?: string | null;

  requestHash: string;
  responseSnapshot?: Json | null;

  existingRecord?: IdempotencyKeyRecord | null;

  financialMutation: boolean;
  allowReplay: boolean;

  now: string;
  expiresAt?: string | null;

  metadata?: Json;
}

export interface DedupeSignalInput {
  dedupeKey?: string | null;
  scope: IdempotencyScope;

  userId?: string | null;
  objectId?: string | null;

  existingRecord?: DedupeKeyRecord | null;

  financialMutation: boolean;
  blockWhileActive: boolean;
  releaseRequested: boolean;

  now: string;
  expiresAt?: string | null;

  metadata?: Json;
}

export interface MutationGuardInput {
  scope: IdempotencyScope;

  userId?: string | null;
  objectId?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  requestHash: string;

  financialMutation: boolean;
  allowReplay: boolean;
  blockDuplicate: boolean;

  existingIdempotencyRecord?: IdempotencyKeyRecord | null;
  existingDedupeRecord?: DedupeKeyRecord | null;

  now: string;
  expiresAt?: string | null;

  metadata?: Json;
}

export interface IdempotencyRuleSet {
  scope: IdempotencyScope;

  requiresIdempotencyKey: boolean;
  requiresDedupeKey: boolean;
  financialMutation: boolean;

  allowReplay: boolean;
  blockDifferentHash: boolean;
  blockInProgress: boolean;
  blockActiveDedupe: boolean;

  defaultExpirationMinutes: number;

  minMatchScore: number;
  minRequestHashConfidenceScore: number;
  maxDuplicateRiskScore: number;
  minMutationSafetyScore: number;

  active: boolean;
}

export interface IdempotencyEvaluationResult {
  status: IdempotencyOutcomeStatus;

  idempotencyKey?: string | null;
  scope: IdempotencyScope;

  matchScore: number;
  requestHashConfidenceScore: number;
  duplicateRiskScore: number;

  newKey: boolean;
  replay: boolean;
  conflict: boolean;
  inProgress: boolean;
  expired: boolean;
  blocked: boolean;

  safeToCreate: boolean;
  safeToReplay: boolean;

  responseSnapshot?: Json | null;

  record: IdempotencyKeyRecord | null;

  reasons: string[];

  idempotencyKeyCreatedEvent?: AlphabetEvent | null;
  idempotencyKeyReplayedEvent?: AlphabetEvent | null;
  idempotencyConflictDetectedEvent?: AlphabetEvent | null;
  idempotencyInProgressEvent?: AlphabetEvent | null;
  idempotencyBlockedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface DedupeEvaluationResult {
  status: DedupeOutcomeStatus;

  dedupeKey?: string | null;
  scope: IdempotencyScope;

  duplicateRiskScore: number;

  newKey: boolean;
  active: boolean;
  duplicate: boolean;
  blocked: boolean;
  expired: boolean;
  released: boolean;

  safeToCreate: boolean;
  safeToProceed: boolean;

  record: DedupeKeyRecord | null;

  reasons: string[];

  dedupeKeyCreatedEvent?: AlphabetEvent | null;
  dedupeDuplicateDetectedEvent?: AlphabetEvent | null;
  dedupeBlockedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface MutationGuardResult {
  status: MutationGuardOutcomeStatus;

  scope: IdempotencyScope;

  allowed: boolean;
  replay: boolean;
  blocked: boolean;

  idempotencyResult: IdempotencyEvaluationResult;
  dedupeResult: DedupeEvaluationResult;

  mutationSafetyScore: number;

  responseSnapshot?: Json | null;

  reasons: string[];

  mutationGuardAllowedEvent?: AlphabetEvent | null;
  mutationGuardBlockedEvent?: AlphabetEvent | null;

  metadata: Json;
}
