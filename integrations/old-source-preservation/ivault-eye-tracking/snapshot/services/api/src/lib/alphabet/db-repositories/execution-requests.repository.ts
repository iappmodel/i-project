import { createServiceDbClient } from "../db-client";
import type { DbExecutionRequest, Json } from "@/types/alphabet/database.types";

export async function insertExecutionRequestDb(params: {
  sourcePolicyDecisionId?: string | null;
  sourceEventIds?: string[];
  targetSystem: string;
  targetObjectId?: string | null;
  action: string;
  status: string;
  priority?: string;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  handlerName: string;
  handlerVersion: string;
  payload?: Json;
  sanitizedPayload?: Json;
  metadata?: Json;
}): Promise<DbExecutionRequest> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("execution_requests")
    .insert({
      source_policy_decision_id: params.sourcePolicyDecisionId ?? null,
      source_event_ids: params.sourceEventIds ?? [],
      target_system: params.targetSystem,
      target_object_id: params.targetObjectId ?? null,
      action: params.action,
      status: params.status,
      priority: params.priority ?? "normal",
      idempotency_key: params.idempotencyKey ?? null,
      dedupe_key: params.dedupeKey ?? null,
      handler_name: params.handlerName,
      handler_version: params.handlerVersion,
      payload: (params.payload ?? {}) as Record<string, unknown>,
      sanitized_payload: (params.sanitizedPayload ?? {}) as Record<string, unknown>,
      metadata: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbExecutionRequest;
}

export async function patchExecutionRequestStatusDb(params: {
  executionRequestId: string;
  status: string;
}): Promise<void> {
  const db = createServiceDbClient();
  const { error } = await db
    .from("execution_requests")
    .update({
      status: params.status,
      updated_at: new Date().toISOString()
    })
    .eq("execution_request_id", params.executionRequestId);

  if (error) throw error;
}
