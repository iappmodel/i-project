import { createServiceDbClient } from "../db-client";
import type { DbExecutionRequest, Json } from "@/types/alphabet/database.types";

export async function claimNextExecutionRequestDb(params: {
  workerId: string;
  targetSystem?: string | null;
}): Promise<DbExecutionRequest | null> {
  const db = createServiceDbClient();

  let query = db
    .from("execution_requests")
    .select("*")
    .in("status", ["request_created", "dispatch_allowed", "retry_pending"])
    .order("created_at", { ascending: true })
    .limit(1);

  if (params.targetSystem) {
    query = query.eq("target_system", params.targetSystem);
  }

  const { data: candidate, error: readError } = await query.maybeSingle();
  if (readError) throw readError;
  if (!candidate) return null;

  const prevMeta =
    candidate.metadata && typeof candidate.metadata === "object" && !Array.isArray(candidate.metadata)
      ? (candidate.metadata as Record<string, unknown>)
      : {};

  const { data, error } = await db
    .from("execution_requests")
    .update({
      status: "execution_locked",
      metadata: {
        ...prevMeta,
        lockedByWorkerId: params.workerId,
        lockedAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq("execution_request_id", candidate.execution_request_id)
    .in("status", ["request_created", "dispatch_allowed", "retry_pending"])
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as DbExecutionRequest | null;
}

export async function markExecutionRunningDb(params: {
  executionRequestId: string;
  workerId: string;
}): Promise<DbExecutionRequest> {
  const db = createServiceDbClient();

  const { data: prev, error: readError } = await db
    .from("execution_requests")
    .select("metadata")
    .eq("execution_request_id", params.executionRequestId)
    .single();

  if (readError) throw readError;

  const prevMeta =
    prev?.metadata && typeof prev.metadata === "object" && !Array.isArray(prev.metadata)
      ? (prev.metadata as Record<string, unknown>)
      : {};

  const { data, error } = await db
    .from("execution_requests")
    .update({
      status: "execution_running",
      dispatched_at: new Date().toISOString(),
      metadata: {
        ...prevMeta,
        workerId: params.workerId,
        runningAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq("execution_request_id", params.executionRequestId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbExecutionRequest;
}

export async function markExecutionCompletedDb(params: {
  executionRequestId: string;
  resultPayload: Json;
}): Promise<DbExecutionRequest> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("execution_requests")
    .update({
      status: "execution_completed",
      result_payload: params.resultPayload,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("execution_request_id", params.executionRequestId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbExecutionRequest;
}

export async function markExecutionFailedDb(params: {
  executionRequestId: string;
  resultPayload: Json;
  retryCount: number;
  retryPending: boolean;
  deadLettered: boolean;
}): Promise<DbExecutionRequest> {
  const db = createServiceDbClient();

  const status = params.deadLettered
    ? "execution_dead_lettered"
    : params.retryPending
      ? "execution_retry_pending"
      : "execution_failed";

  const { data, error } = await db
    .from("execution_requests")
    .update({
      status,
      retry_count: params.retryCount,
      result_payload: params.resultPayload,
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("execution_request_id", params.executionRequestId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbExecutionRequest;
}
