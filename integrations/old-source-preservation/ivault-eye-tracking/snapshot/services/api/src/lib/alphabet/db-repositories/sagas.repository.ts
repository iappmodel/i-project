import { createServiceDbClient } from "../db-client";
import type { DbSagaRecord, DbSagaStep, Json } from "@/types/alphabet/database.types";

export async function insertSagaRecordDb(params: {
  sagaType: string;
  status: string;
  userId: string;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  sourceActionIntentId?: string | null;
  policyDecisionId?: string | null;
  sourceEventIds?: string[];
  idempotencyKey?: string | null;
  timeoutDeadline?: string | null;
  metadata?: Json;
}): Promise<DbSagaRecord> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("saga_records")
    .insert({
      saga_type: params.sagaType,
      status: params.status,
      user_id: params.userId,
      wallet_id: params.walletId ?? null,
      content_id: params.contentId ?? null,
      campaign_id: params.campaignId ?? null,
      grant_eligibility_id: params.grantEligibilityId ?? null,
      source_action_intent_id: params.sourceActionIntentId ?? null,
      policy_decision_id: params.policyDecisionId ?? null,
      source_event_ids: params.sourceEventIds ?? [],
      idempotency_key: params.idempotencyKey ?? null,
      timeout_deadline: params.timeoutDeadline ?? null,
      metadata: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbSagaRecord;
}

export async function insertSagaStepDb(params: {
  sagaId: string;
  stepType: string;
  status: string;
  label: string;
  sourceObjectId?: string | null;
  sourceEventId?: string | null;
  dependsOnStepIds?: string[];
  retryCount?: number;
  maxRetries?: number;
  compensationRequired?: boolean;
  compensationAction?: string | null;
  metadata?: Json;
}): Promise<DbSagaStep> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("saga_steps")
    .insert({
      saga_id: params.sagaId,
      step_type: params.stepType,
      status: params.status,
      label: params.label,
      source_object_id: params.sourceObjectId ?? null,
      source_event_id: params.sourceEventId ?? null,
      depends_on_step_ids: params.dependsOnStepIds ?? [],
      retry_count: params.retryCount ?? 0,
      max_retries: params.maxRetries ?? 3,
      compensation_required: params.compensationRequired ?? false,
      compensation_action: params.compensationAction ?? null,
      metadata: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbSagaStep;
}

export async function getSagaRecordDb(sagaId: string): Promise<DbSagaRecord | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("saga_records")
    .select("*")
    .eq("saga_id", sagaId)
    .maybeSingle();

  if (error) throw error;
  return data as DbSagaRecord | null;
}
