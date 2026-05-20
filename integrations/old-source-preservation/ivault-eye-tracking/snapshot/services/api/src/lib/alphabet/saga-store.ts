import { SAGA_RULES } from "../../data/alphabet/saga-rules";
import type {
  SagaEvaluationResult,
  SagaRecord,
  SagaRecordStatus,
  SagaSignalInput,
  SagaStep,
  SagaStepStatus,
  SagaStepType,
  SagaType
} from "../../types/alphabet/saga.types";
import { evaluateSaga } from "./saga-engine";

type SagaStoreState = {
  records: Map<string, SagaRecord>;
  results: Map<string, SagaEvaluationResult>;
};

const store: SagaStoreState = {
  records: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutes(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function getRule(sagaType: SagaType) {
  return SAGA_RULES.find((rule) => rule.active && rule.sagaType === sagaType);
}

function mapOutcomeToRecordStatus(status: SagaEvaluationResult["status"]): SagaRecordStatus {
  switch (status) {
    case "saga_ready":
      return "saga_started";
    case "saga_waiting":
      return "saga_started";
    case "saga_blocked":
      return "saga_failed";
    case "saga_requires_review":
      return "saga_started";
    case "saga_completed":
      return "saga_completed";
    case "saga_failed":
      return "saga_failed";
    case "saga_canceled":
      return "saga_canceled";
    case "saga_compensation_required":
      return "saga_compensating";
    case "saga_compensated":
      return "saga_compensated";
    default:
      return "saga_created";
  }
}

export function createSagaStep(params: {
  stepType: SagaStepType;
  label: string;
  status?: SagaStepStatus;
  sourceObjectId?: string | null;
  sourceEventId?: string | null;
  dependsOnStepIds?: string[];
  maxRetries?: number;
  compensationRequired?: boolean;
  compensationAction?: string | null;
  metadata?: Record<string, unknown>;
}): SagaStep {
  return {
    sagaStepId: createId("saga_step"),
    stepType: params.stepType,
    status: params.status ?? "pending",
    label: params.label,
    sourceObjectId: params.sourceObjectId ?? null,
    sourceEventId: params.sourceEventId ?? null,
    dependsOnStepIds: params.dependsOnStepIds ?? [],
    retryCount: 0,
    maxRetries: params.maxRetries ?? 3,
    compensationRequired: params.compensationRequired ?? false,
    compensationAction: params.compensationAction ?? null,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    metadata: params.metadata ?? {}
  };
}

export function createSagaRecord(params: {
  sagaType: SagaType;
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  sourceActionIntentId?: string | null;
  policyDecisionId?: string | null;
  executionRequestIds?: string[];
  handlerDefinitionIds?: string[];
  auditRecordIds?: string[];
  notificationIds?: string[];
  sourceEventIds?: string[];
  steps: SagaStep[];
  idempotencyKey?: string | null;
  timeoutDeadline?: string | null;
}): SagaRecord {
  const now = nowIso();
  const rule = getRule(params.sagaType);

  const record: SagaRecord = {
    sagaId: createId("saga"),
    sagaType: params.sagaType,
    status: "saga_created",
    userId: params.userId,
    creatorId: params.creatorId ?? null,
    businessId: params.businessId ?? null,
    walletId: params.walletId ?? null,
    contentId: params.contentId ?? null,
    campaignId: params.campaignId ?? null,
    grantEligibilityId: params.grantEligibilityId ?? null,
    sourceActionIntentId: params.sourceActionIntentId ?? null,
    policyDecisionId: params.policyDecisionId ?? null,
    executionRequestIds: params.executionRequestIds ?? [],
    handlerDefinitionIds: params.handlerDefinitionIds ?? [],
    auditRecordIds: params.auditRecordIds ?? [],
    notificationIds: params.notificationIds ?? [],
    sourceEventIds: params.sourceEventIds ?? [],
    steps: params.steps,
    idempotencyKey: params.idempotencyKey ?? null,
    timeoutDeadline: params.timeoutDeadline ?? addMinutes(rule?.defaultTimeoutMinutes ?? 30),
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    canceledAt: null
  };

  store.records.set(record.sagaId, record);
  return record;
}

export function getSagaRecord(sagaId: string): SagaRecord | null {
  return store.records.get(sagaId) ?? null;
}

export function startSaga(sagaId: string): SagaRecord {
  const record = getSagaRecord(sagaId);
  if (!record) throw new Error("Saga record not found.");

  const now = nowIso();
  const next: SagaRecord = {
    ...record,
    status: "saga_started",
    startedAt: record.startedAt ?? now,
    updatedAt: now
  };

  store.records.set(next.sagaId, next);
  return next;
}

export function updateSagaStepStatus(params: {
  sagaId: string;
  sagaStepId: string;
  status: SagaStepStatus;
}): SagaRecord {
  const record = getSagaRecord(params.sagaId);
  if (!record) throw new Error("Saga record not found.");

  const now = nowIso();
  const steps = record.steps.map((step) => {
    if (step.sagaStepId !== params.sagaStepId) return step;
    return {
      ...step,
      status: params.status,
      startedAt: params.status === "running" && !step.startedAt ? now : step.startedAt,
      completedAt: params.status === "passed" || params.status === "skipped" ? now : step.completedAt,
      failedAt: params.status === "failed" ? now : step.failedAt
    };
  });

  const next: SagaRecord = {
    ...record,
    steps,
    updatedAt: now
  };

  store.records.set(next.sagaId, next);
  return next;
}

export function attachSagaObjectIds(params: {
  sagaId: string;
  policyDecisionId?: string | null;
  executionRequestIds?: string[];
  handlerDefinitionIds?: string[];
  auditRecordIds?: string[];
  notificationIds?: string[];
  sourceEventIds?: string[];
}): SagaRecord {
  const record = getSagaRecord(params.sagaId);
  if (!record) throw new Error("Saga record not found.");

  const next: SagaRecord = {
    ...record,
    policyDecisionId: params.policyDecisionId ?? record.policyDecisionId,
    executionRequestIds: params.executionRequestIds ?? record.executionRequestIds,
    handlerDefinitionIds: params.handlerDefinitionIds ?? record.handlerDefinitionIds,
    auditRecordIds: params.auditRecordIds ?? record.auditRecordIds,
    notificationIds: params.notificationIds ?? record.notificationIds,
    sourceEventIds: params.sourceEventIds ?? record.sourceEventIds,
    updatedAt: nowIso()
  };

  store.records.set(next.sagaId, next);
  return next;
}

export function evaluateStoredSaga(
  input: Omit<
    SagaSignalInput,
    | "sagaId"
    | "sagaType"
    | "currentStatus"
    | "userId"
    | "creatorId"
    | "businessId"
    | "walletId"
    | "contentId"
    | "campaignId"
    | "grantEligibilityId"
    | "sourceActionIntentId"
    | "policyDecisionId"
    | "executionRequestIds"
    | "handlerDefinitionIds"
    | "auditRecordIds"
    | "notificationIds"
    | "sourceEventIds"
    | "steps"
    | "idempotencyKey"
    | "timeoutDeadline"
    | "now"
  > & {
    sagaId: string;
    now?: string;
  }
): SagaEvaluationResult {
  const record = getSagaRecord(input.sagaId);
  if (!record) throw new Error("Saga record not found.");

  const result = evaluateSaga({
    ...input,
    sagaId: record.sagaId,
    sagaType: record.sagaType,
    currentStatus: record.status,
    userId: record.userId,
    creatorId: record.creatorId,
    businessId: record.businessId,
    walletId: record.walletId,
    contentId: record.contentId,
    campaignId: record.campaignId,
    grantEligibilityId: record.grantEligibilityId,
    sourceActionIntentId: record.sourceActionIntentId,
    policyDecisionId: record.policyDecisionId,
    executionRequestIds: record.executionRequestIds,
    handlerDefinitionIds: record.handlerDefinitionIds,
    auditRecordIds: record.auditRecordIds,
    notificationIds: record.notificationIds,
    sourceEventIds: record.sourceEventIds,
    steps: record.steps,
    idempotencyKey: record.idempotencyKey,
    timeoutDeadline: record.timeoutDeadline,
    now: input.now ?? nowIso(),
    metadata: { ...input.metadata }
  });

  const now = nowIso();
  const next: SagaRecord = {
    ...record,
    status: mapOutcomeToRecordStatus(result.status),
    completedAt: result.completed && !record.completedAt ? now : record.completedAt,
    failedAt: result.failed && !record.failedAt ? now : record.failedAt,
    canceledAt: result.canceled && !record.canceledAt ? now : record.canceledAt,
    updatedAt: now
  };

  store.records.set(next.sagaId, next);
  store.results.set(result.sagaId, result);

  return result;
}

export function listSagaRecords(params?: {
  userId?: string;
  sagaType?: SagaType;
  status?: SagaRecordStatus;
}): SagaRecord[] {
  return Array.from(store.records.values()).filter((record) => {
    if (params?.userId && record.userId !== params.userId) return false;
    if (params?.sagaType && record.sagaType !== params.sagaType) return false;
    if (params?.status && record.status !== params.status) return false;
    return true;
  });
}

export function getSagaEvaluationResult(sagaId: string): SagaEvaluationResult | null {
  return store.results.get(sagaId) ?? null;
}

export function resetSagaStoreForTests(): void {
  store.records.clear();
  store.results.clear();
}
