import type {
  ActionIntentContext,
  ActionIntentEvaluationResult,
  ActionIntentRecord,
  ActionIntentRecordStatus,
  ActionIntentRiskSignals,
  ActionIntentSignalInput,
  ActionIntentSource,
  ActionIntentType
} from "@/types/alphabet/action-intent.types";
import { ACTION_INTENT_RULES } from "@/data/alphabet/action-intent-rules";
import { evaluateActionIntent } from "./action-intent-engine";

type ActionIntentStoreState = {
  records: Map<string, ActionIntentRecord>;
  results: Map<string, ActionIntentEvaluationResult>;
};

const store: ActionIntentStoreState = {
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

function getRule(intentType: ActionIntentType) {
  return ACTION_INTENT_RULES.find((rule) => rule.active && rule.intentType === intentType);
}

function mapOutcomeToRecordStatus(
  status: ActionIntentEvaluationResult["status"]
): ActionIntentRecordStatus {
  switch (status) {
    case "intent_ready":
      return "accepted";
    case "intent_needs_context":
      return "context_captured";
    case "intent_duplicate":
      return "rejected";
    case "intent_policy_required":
      return "policy_requested";
    case "intent_saga_required":
      return "saga_requested";
    case "intent_rejected":
      return "rejected";
    case "intent_canceled":
      return "canceled";
    case "intent_expired":
      return "expired";
    default:
      return "intent_created";
  }
}

export function createActionIntentRecord(params: {
  intentType: ActionIntentType;
  intentSource: ActionIntentSource;

  userId: string;
  actorUserId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  sessionId?: string | null;
  deviceId?: string | null;
  clientRequestId?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds?: string[];

  context: ActionIntentContext;
  riskSignals: ActionIntentRiskSignals;

  expiresAt?: string | null;
}): ActionIntentRecord {
  const now = nowIso();
  const rule = getRule(params.intentType);

  const record: ActionIntentRecord = {
    actionIntentId: createId("action_intent"),
    intentType: params.intentType,
    intentSource: params.intentSource,
    status: "intent_created",
    userId: params.userId,
    actorUserId: params.actorUserId ?? null,
    creatorId: params.creatorId ?? null,
    businessId: params.businessId ?? null,
    walletId: params.walletId ?? null,
    contentId: params.contentId ?? null,
    campaignId: params.campaignId ?? null,
    grantEligibilityId: params.grantEligibilityId ?? null,
    sessionId: params.sessionId ?? null,
    deviceId: params.deviceId ?? null,
    clientRequestId: params.clientRequestId ?? null,
    idempotencyKey: params.idempotencyKey ?? null,
    dedupeKey: params.dedupeKey ?? null,
    sourceEventIds: params.sourceEventIds ?? [],
    context: params.context,
    riskSignals: params.riskSignals,
    expiresAt: params.expiresAt ?? addMinutes(rule?.defaultExpirationMinutes ?? 15),
    createdAt: now,
    updatedAt: now
  };

  store.records.set(record.actionIntentId, record);
  return record;
}

export function getActionIntentRecord(actionIntentId: string): ActionIntentRecord | null {
  return store.records.get(actionIntentId) ?? null;
}

function countDuplicates(record: ActionIntentRecord): number {
  if (!record.dedupeKey) return 0;

  return Array.from(store.records.values()).filter(
    (candidate) =>
      candidate.actionIntentId !== record.actionIntentId &&
      candidate.dedupeKey === record.dedupeKey &&
      candidate.status !== "canceled" &&
      candidate.status !== "expired" &&
      candidate.status !== "rejected"
  ).length;
}

export function updateActionIntentContext(params: {
  actionIntentId: string;
  context: Partial<ActionIntentContext>;
}): ActionIntentRecord {
  const record = getActionIntentRecord(params.actionIntentId);
  if (!record) throw new Error("Action intent not found.");

  const next: ActionIntentRecord = {
    ...record,
    context: {
      ...record.context,
      ...params.context
    },
    status: "context_captured",
    updatedAt: nowIso()
  };

  store.records.set(next.actionIntentId, next);
  return next;
}

export function cancelActionIntent(actionIntentId: string): ActionIntentRecord {
  const record = getActionIntentRecord(actionIntentId);
  if (!record) throw new Error("Action intent not found.");

  const next: ActionIntentRecord = {
    ...record,
    status: "canceled",
    updatedAt: nowIso()
  };

  store.records.set(next.actionIntentId, next);
  return next;
}

export function evaluateStoredActionIntent(
  input: Omit<
    ActionIntentSignalInput,
    | "actionIntentId"
    | "intentType"
    | "intentSource"
    | "currentStatus"
    | "userId"
    | "actorUserId"
    | "creatorId"
    | "businessId"
    | "walletId"
    | "contentId"
    | "campaignId"
    | "grantEligibilityId"
    | "sessionId"
    | "deviceId"
    | "clientRequestId"
    | "idempotencyKey"
    | "dedupeKey"
    | "duplicateIntentCount"
    | "sourceEventIds"
    | "context"
    | "riskSignals"
    | "expiresAt"
    | "now"
  > & {
    actionIntentId: string;
    now?: string;
  }
): ActionIntentEvaluationResult {
  const record = getActionIntentRecord(input.actionIntentId);
  if (!record) throw new Error("Action intent not found.");

  const result = evaluateActionIntent({
    ...input,
    actionIntentId: record.actionIntentId,
    intentType: record.intentType,
    intentSource: record.intentSource,
    currentStatus: record.status,
    userId: record.userId,
    actorUserId: record.actorUserId,
    creatorId: record.creatorId,
    businessId: record.businessId,
    walletId: record.walletId,
    contentId: record.contentId,
    campaignId: record.campaignId,
    grantEligibilityId: record.grantEligibilityId,
    sessionId: record.sessionId,
    deviceId: record.deviceId,
    clientRequestId: record.clientRequestId,
    idempotencyKey: record.idempotencyKey,
    dedupeKey: record.dedupeKey,
    duplicateIntentCount: countDuplicates(record),
    sourceEventIds: record.sourceEventIds,
    context: record.context,
    riskSignals: record.riskSignals,
    expiresAt: record.expiresAt,
    now: input.now ?? nowIso(),
    metadata: {
      ...input.metadata
    }
  });

  const next: ActionIntentRecord = {
    ...record,
    status: mapOutcomeToRecordStatus(result.status),
    updatedAt: nowIso()
  };

  store.records.set(next.actionIntentId, next);
  store.results.set(result.actionIntentId, result);

  return result;
}

export function listActionIntentRecords(params?: {
  userId?: string;
  intentType?: ActionIntentType;
  status?: ActionIntentRecordStatus;
}): ActionIntentRecord[] {
  return Array.from(store.records.values()).filter((record) => {
    if (params?.userId && record.userId !== params.userId) return false;
    if (params?.intentType && record.intentType !== params.intentType) return false;
    if (params?.status && record.status !== params.status) return false;
    return true;
  });
}

export function getActionIntentEvaluationResult(
  actionIntentId: string
): ActionIntentEvaluationResult | null {
  return store.results.get(actionIntentId) ?? null;
}

export function resetActionIntentStoreForTests(): void {
  store.records.clear();
  store.results.clear();
}
