import type { AlphabetEvent } from "./event.types";
import type { DbExecutionRequest, DbHandlerDefinition, Json } from "./database.types";

export type WorkerExecutionStatus =
  | "request_created"
  | "dispatch_allowed"
  | "retry_pending"
  | "execution_locked"
  | "execution_running"
  | "execution_completed"
  | "execution_failed"
  | "execution_retry_pending"
  | "execution_dead_lettered";

export type WorkerOutcomeStatus =
  | "worker_ready"
  | "worker_no_job"
  | "worker_locked"
  | "worker_handler_missing"
  | "worker_payload_invalid"
  | "worker_completed"
  | "worker_failed"
  | "worker_retry_scheduled"
  | "worker_dead_lettered";

export type WorkerDomainHandlerName =
  | "wallet.credit"
  | "wallet.debit"
  | "withdrawal.create"
  | "notification.send"
  | "audit.create"
  | "system.noop";

export interface WorkerRuntimeRuleSet {
  handlerName: WorkerDomainHandlerName | string;

  financialHandler: boolean;
  externalSideEffect: boolean;
  requiresAudit: boolean;
  requiresNotification: boolean;
  requiresIdempotency: boolean;
  retryAllowed: boolean;

  maxRetryCount: number;
  lockTtlSeconds: number;
  timeoutMs: number;

  active: boolean;
}

export interface WorkerLockResult {
  locked: boolean;
  executionRequest: DbExecutionRequest | null;
  reasonCodes: string[];
}

export interface WorkerHandlerContext {
  executionRequest: DbExecutionRequest;
  handlerDefinition: DbHandlerDefinition;
  workerId: string;
  now: string;
}

export interface WorkerHandlerResult {
  ok: boolean;
  status: "completed" | "failed" | "retryable_failed" | "dead_lettered";

  resultPayload: Json;

  ledgerEntryIds: string[];
  auditRecordIds: string[];
  notificationIds: string[];
  eventIds: string[];

  publicMessage?: string | null;
  internalReasonCodes: string[];

  retryable: boolean;
}

export interface WorkerRunInput {
  workerId: string;
  targetSystem?: string | null;
  limit?: number;
  now?: string;
}

export interface WorkerRunResult {
  workerId: string;
  status: WorkerOutcomeStatus;

  executionRequestId?: string | null;
  handlerDefinitionId?: string | null;

  locked: boolean;
  completed: boolean;
  failed: boolean;
  retryScheduled: boolean;
  deadLettered: boolean;

  resultPayload: Json | null;

  ledgerEntryIds: string[];
  auditRecordIds: string[];
  notificationIds: string[];
  eventIds: string[];

  reasonCodes: string[];

  workerExecutionLockedEvent?: AlphabetEvent | null;
  workerExecutionStartedEvent?: AlphabetEvent | null;
  workerExecutionCompletedEvent?: AlphabetEvent | null;
  workerExecutionFailedEvent?: AlphabetEvent | null;
  workerExecutionRetryScheduledEvent?: AlphabetEvent | null;
  workerExecutionDeadLetteredEvent?: AlphabetEvent | null;
  workerHandlerResolvedEvent?: AlphabetEvent | null;
  workerHandlerMissingEvent?: AlphabetEvent | null;
  workerHandlerPayloadValidEvent?: AlphabetEvent | null;
  workerHandlerPayloadInvalidEvent?: AlphabetEvent | null;
}
