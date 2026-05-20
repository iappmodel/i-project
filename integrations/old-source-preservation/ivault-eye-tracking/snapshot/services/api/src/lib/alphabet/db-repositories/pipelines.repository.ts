import { createServiceDbClient } from "../db-client";
import type { DbPipelineRecord, Json } from "@/types/alphabet/database.types";

export async function findLatestPipelineByIdempotencyKeyDb(params: {
  userId: string;
  idempotencyKey: string;
}): Promise<DbPipelineRecord | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("pipeline_records")
    .select("*")
    .eq("user_id", params.userId)
    .eq("idempotency_key", params.idempotencyKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as DbPipelineRecord | null;
}

export async function insertPipelineRecordDb(params: {
  pipelineType: string;
  status: string;
  userId: string;
  actorUserId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  requestSource: string;
  requestChannel: string;
  requestedIntentType: string;
  requestedPolicyAction?: string | null;
  requestedPolicyDomain?: string | null;
  requestedSagaType?: string | null;
  targetSystems?: string[];
  actionIntentId?: string | null;
  policyDecisionId?: string | null;
  sagaId?: string | null;
  executionRequestIds?: string[];
  handlerDefinitionIds?: string[];
  auditRecordIds?: string[];
  notificationIds?: string[];
  sourceEventIds?: string[];
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  steps?: Json;
  riskSignals?: Json;
  metadata?: Json;
}): Promise<DbPipelineRecord> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("pipeline_records")
    .insert({
      pipeline_type: params.pipelineType,
      status: params.status,
      user_id: params.userId,
      actor_user_id: params.actorUserId ?? null,
      creator_id: params.creatorId ?? null,
      business_id: params.businessId ?? null,
      wallet_id: params.walletId ?? null,
      content_id: params.contentId ?? null,
      campaign_id: params.campaignId ?? null,
      grant_eligibility_id: params.grantEligibilityId ?? null,
      request_source: params.requestSource,
      request_channel: params.requestChannel,
      requested_intent_type: params.requestedIntentType,
      requested_policy_action: params.requestedPolicyAction ?? null,
      requested_policy_domain: params.requestedPolicyDomain ?? null,
      requested_saga_type: params.requestedSagaType ?? null,
      target_systems: params.targetSystems ?? [],
      action_intent_id: params.actionIntentId ?? null,
      policy_decision_id: params.policyDecisionId ?? null,
      saga_id: params.sagaId ?? null,
      execution_request_ids: params.executionRequestIds ?? [],
      handler_definition_ids: params.handlerDefinitionIds ?? [],
      audit_record_ids: params.auditRecordIds ?? [],
      notification_ids: params.notificationIds ?? [],
      source_event_ids: params.sourceEventIds ?? [],
      idempotency_key: params.idempotencyKey ?? null,
      dedupe_key: params.dedupeKey ?? null,
      steps: params.steps ?? [],
      risk_signals: params.riskSignals ?? {},
      metadata: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbPipelineRecord;
}

export async function updatePipelineRecordLinksDb(params: {
  pipelineId: string;
  policyDecisionId?: string | null;
  sagaId?: string | null;
  executionRequestIds?: string[];
  handlerDefinitionIds?: string[];
  auditRecordIds?: string[];
  notificationIds?: string[];
  status?: string;
  metadata?: Json;
}): Promise<DbPipelineRecord> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("pipeline_records")
    .update({
      ...(params.policyDecisionId !== undefined
        ? { policy_decision_id: params.policyDecisionId }
        : {}),
      ...(params.sagaId !== undefined ? { saga_id: params.sagaId } : {}),
      ...(params.executionRequestIds
        ? { execution_request_ids: params.executionRequestIds }
        : {}),
      ...(params.handlerDefinitionIds
        ? { handler_definition_ids: params.handlerDefinitionIds }
        : {}),
      ...(params.auditRecordIds ? { audit_record_ids: params.auditRecordIds } : {}),
      ...(params.notificationIds ? { notification_ids: params.notificationIds } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.metadata ? { metadata: params.metadata as Record<string, unknown> } : {}),
      updated_at: new Date().toISOString()
    })
    .eq("pipeline_id", params.pipelineId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbPipelineRecord;
}

export async function getPipelineRecordDb(
  pipelineId: string
): Promise<DbPipelineRecord | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("pipeline_records")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .maybeSingle();

  if (error) throw error;
  return data as DbPipelineRecord | null;
}
