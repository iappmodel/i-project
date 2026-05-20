import { RESTRICTED_PAYLOAD_KEYS } from "../../data/alphabet/execution-router-rules";
import type {
  ExecutionAction,
  ExecutionPriority,
  ExecutionRecordStatus,
  ExecutionRequestRecord,
  ExecutionRouterEvaluationResult,
  ExecutionRouterSignalInput,
  ExecutionTargetSystem
} from "../../types/alphabet/execution-router.types";
import {
  evaluateExecutionRequest,
  sanitizeExecutionPayload
} from "./execution-router-engine";

type ExecutionRouterStoreState = {
  records: Map<string, ExecutionRequestRecord>;
  results: Map<string, ExecutionRouterEvaluationResult>;
};

const store: ExecutionRouterStoreState = {
  records: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapStatus(status: ExecutionRouterEvaluationResult["status"]): ExecutionRecordStatus {
  switch (status) {
    case "execution_queued":
      return "queued";
    case "execution_allowed":
      return "dispatch_allowed";
    case "execution_denied":
      return "dispatch_denied";
    case "execution_requires_review":
      return "dispatch_requires_review";
    case "execution_dispatched":
      return "dispatched";
    case "execution_completed":
      return "executed";
    case "execution_failed":
      return "failed";
    case "execution_canceled":
      return "canceled";
    default:
      return "request_created";
  }
}

export function createExecutionRequest(params: {
  sourcePolicyDecisionId?: string | null;
  sourceEventIds?: string[];
  targetSystem: ExecutionTargetSystem;
  targetObjectId?: string | null;
  action: ExecutionAction;
  priority?: ExecutionPriority;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  maxRetries?: number;
  handlerName: string;
  handlerVersion?: string;
  payload?: Record<string, unknown>;
}): ExecutionRequestRecord {
  const now = nowIso();
  const payload = params.payload ?? {};
  const sanitizedPayload = sanitizeExecutionPayload(payload);

  const record: ExecutionRequestRecord = {
    executionRequestId: createId("execution_request"),
    sourcePolicyDecisionId: params.sourcePolicyDecisionId ?? null,
    sourceEventIds: params.sourceEventIds ?? [],
    targetSystem: params.targetSystem,
    targetObjectId: params.targetObjectId ?? null,
    action: params.action,
    status: "request_created",
    priority: params.priority ?? "normal",
    idempotencyKey: params.idempotencyKey ?? null,
    dedupeKey: params.dedupeKey ?? null,
    retryCount: 0,
    maxRetries: params.maxRetries ?? 3,
    handlerName: params.handlerName,
    handlerVersion: params.handlerVersion ?? "v1",
    payload,
    sanitizedPayload,
    resultPayload: null,
    createdAt: now,
    updatedAt: now,
    dispatchedAt: null,
    executedAt: null,
    failedAt: null
  };

  store.records.set(record.executionRequestId, record);
  return record;
}

export function getExecutionRequest(
  executionRequestId: string
): ExecutionRequestRecord | null {
  return store.records.get(executionRequestId) ?? null;
}

function countDuplicates(record: ExecutionRequestRecord): number {
  if (!record.dedupeKey) return 0;

  return Array.from(store.records.values()).filter(
    (candidate) =>
      candidate.executionRequestId !== record.executionRequestId &&
      candidate.dedupeKey === record.dedupeKey &&
      candidate.status !== "failed" &&
      candidate.status !== "canceled"
  ).length;
}

function containsRestrictedKeys(payload: Record<string, unknown>): boolean {
  const serialized = JSON.stringify(payload);
  return Array.from(RESTRICTED_PAYLOAD_KEYS).some((key) => serialized.includes(key));
}

export function evaluateStoredExecutionRequest(
  input: Omit<
    ExecutionRouterSignalInput,
    | "executionRequestId"
    | "sourcePolicyDecisionId"
    | "sourceEventIds"
    | "targetSystem"
    | "targetObjectId"
    | "action"
    | "currentStatus"
    | "priority"
    | "idempotencyKey"
    | "dedupeKey"
    | "duplicateRequestCount"
    | "retryCount"
    | "maxRetries"
    | "handlerName"
    | "handlerVersion"
    | "payload"
    | "sanitizedPayload"
    | "resultPayload"
    | "containsRestrictedPayloadKeys"
  > & {
    executionRequestId: string;
    resultPayload?: Record<string, unknown> | null;
  }
): ExecutionRouterEvaluationResult {
  const record = getExecutionRequest(input.executionRequestId);

  if (!record) {
    throw new Error("Execution request not found.");
  }

  const result = evaluateExecutionRequest({
    ...input,
    executionRequestId: record.executionRequestId,
    sourcePolicyDecisionId: record.sourcePolicyDecisionId,
    sourceEventIds: record.sourceEventIds,
    targetSystem: record.targetSystem,
    targetObjectId: record.targetObjectId,
    action: record.action,
    currentStatus: record.status,
    priority: record.priority,
    idempotencyKey: record.idempotencyKey,
    dedupeKey: record.dedupeKey,
    duplicateRequestCount: countDuplicates(record),
    retryCount: record.retryCount,
    maxRetries: record.maxRetries,
    handlerName: record.handlerName,
    handlerVersion: record.handlerVersion,
    payload: record.payload,
    sanitizedPayload: record.sanitizedPayload,
    resultPayload: input.resultPayload ?? record.resultPayload,
    containsRestrictedPayloadKeys: containsRestrictedKeys(record.payload),
    metadata: {
      ...input.metadata
    }
  });

  const now = nowIso();

  const next: ExecutionRequestRecord = {
    ...record,
    status: mapStatus(result.status),
    sanitizedPayload: result.sanitizedPayload,
    resultPayload: result.resultPayload ?? record.resultPayload,
    dispatchedAt: result.dispatched && !record.dispatchedAt ? now : record.dispatchedAt,
    executedAt: result.completed && !record.executedAt ? now : record.executedAt,
    failedAt: result.failed && !record.failedAt ? now : record.failedAt,
    updatedAt: now
  };

  store.records.set(next.executionRequestId, next);
  store.results.set(result.executionRequestId, result);

  return result;
}

export function incrementExecutionRetry(executionRequestId: string): ExecutionRequestRecord {
  const record = getExecutionRequest(executionRequestId);
  if (!record) throw new Error("Execution request not found.");

  const next: ExecutionRequestRecord = {
    ...record,
    retryCount: record.retryCount + 1,
    status: "queued",
    updatedAt: nowIso()
  };

  store.records.set(next.executionRequestId, next);
  return next;
}

export function markExecutionResult(params: {
  executionRequestId: string;
  succeeded: boolean;
  resultPayload?: Record<string, unknown>;
}): ExecutionRequestRecord {
  const record = getExecutionRequest(params.executionRequestId);
  if (!record) throw new Error("Execution request not found.");

  const now = nowIso();

  const next: ExecutionRequestRecord = {
    ...record,
    status: params.succeeded ? "executed" : "failed",
    resultPayload: params.resultPayload ?? record.resultPayload,
    executedAt: params.succeeded ? now : record.executedAt,
    failedAt: params.succeeded ? record.failedAt : now,
    updatedAt: now
  };

  store.records.set(next.executionRequestId, next);
  return next;
}

export function listExecutionRequests(params?: {
  targetSystem?: ExecutionTargetSystem;
  status?: ExecutionRecordStatus;
  sourcePolicyDecisionId?: string;
}): ExecutionRequestRecord[] {
  return Array.from(store.records.values()).filter((record) => {
    if (params?.targetSystem && record.targetSystem !== params.targetSystem) return false;
    if (params?.status && record.status !== params.status) return false;
    if (
      params?.sourcePolicyDecisionId &&
      record.sourcePolicyDecisionId !== params.sourcePolicyDecisionId
    ) {
      return false;
    }
    return true;
  });
}

export function getExecutionEvaluationResult(
  executionRequestId: string
): ExecutionRouterEvaluationResult | null {
  return store.results.get(executionRequestId) ?? null;
}

export function resetExecutionRouterStoreForTests(): void {
  store.records.clear();
  store.results.clear();
}
