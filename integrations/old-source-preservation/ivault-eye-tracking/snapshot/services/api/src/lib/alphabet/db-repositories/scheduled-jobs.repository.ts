import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function getScheduledJobDefinitionDb(jobKey: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("scheduled_job_definitions")
    .select("*")
    .eq("job_key", jobKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listScheduledJobRunsDb(params?: {
  jobKey?: string | null;
  status?: string | null;
  limit?: number;
}) {
  const db = createServiceDbClient();

  let query = db
    .from("scheduled_job_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.jobKey) query = query.eq("job_key", params.jobKey);
  if (params?.status) query = query.eq("status", params.status);

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function getScheduledJobRunDb(jobRunId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("scheduled_job_runs")
    .select("*")
    .eq("job_run_id", jobRunId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getScheduledJobLockDb(lockKey: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("scheduled_job_locks")
    .select("*")
    .eq("lock_key", lockKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function acquireScheduledJobLockDb(params: {
  jobKey: string;
  lockKey: string;
  lockedBy: string;
  lockTtlSeconds: number;
  metadata?: Json;
}): Promise<Record<string, unknown> | null> {
  const db = createServiceDbClient();

  const lockExpiresAt = new Date(Date.now() + params.lockTtlSeconds * 1000).toISOString();
  const nowIso = new Date().toISOString();

  await db.from("scheduled_job_locks").delete().eq("lock_key", params.lockKey).lt("lock_expires_at", nowIso);

  const { data, error } = await db
    .from("scheduled_job_locks")
    .insert({
      lock_key: params.lockKey,
      job_key: params.jobKey,
      locked_by: params.lockedBy,
      lock_expires_at: lockExpiresAt,
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await getScheduledJobLockDb(params.lockKey);
      if (existing && new Date(String(existing.lock_expires_at)).getTime() > Date.now()) {
        return null;
      }
    }
    throw error;
  }

  return data as Record<string, unknown>;
}

export async function releaseScheduledJobLockDb(lockKey: string) {
  const db = createServiceDbClient();

  const { error } = await db.from("scheduled_job_locks").delete().eq("lock_key", lockKey);

  if (error) throw error;

  return {
    released: true,
    lockKey
  };
}

export async function insertScheduledJobRunDb(params: {
  jobKey: string;
  jobCategory: string;
  status: string;

  triggeredBy: string;
  triggeredByUserId?: string | null;

  attempts: number;

  lockKey?: string | null;
  lockedBy?: string | null;

  safetyScores?: Json;
  reasonCodes?: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const now = new Date().toISOString();

  const { data, error } = await db
    .from("scheduled_job_runs")
    .insert({
      job_key: params.jobKey,
      job_category: params.jobCategory,
      status: params.status,
      triggered_by: params.triggeredBy,
      triggered_by_user_id: params.triggeredByUserId ?? null,
      started_at: params.status === "job_running" ? now : null,
      attempts: params.attempts,
      lock_key: params.lockKey ?? null,
      locked_by: params.lockedBy ?? null,
      safety_scores: params.safetyScores ?? {},
      reason_codes: params.reasonCodes ?? [],
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateScheduledJobRunDb(params: {
  jobRunId: string;
  status: string;
  startedAt?: string | null;
  resultPayload?: Json;
  errorPayload?: Json;
  sourceEventIds?: string[];
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];
  scannedObjectCounts?: Json;
  mutationCounts?: Json;
  reasonCodes?: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const now = new Date().toISOString();

  const existing = await getScheduledJobRunDb(params.jobRunId);
  const startedAt = params.startedAt ?? (existing?.started_at as string | null) ?? now;

  const durationMs = new Date(now).getTime() - new Date(startedAt).getTime();

  const timestampPatch: Record<string, string> = {};

  if (params.status === "job_completed") timestampPatch.completed_at = now;
  if (params.status === "job_failed") timestampPatch.failed_at = now;
  if (params.status === "job_timed_out") timestampPatch.timed_out_at = now;
  if (params.status === "job_dead_lettered") timestampPatch.dead_lettered_at = now;

  const { data, error } = await db
    .from("scheduled_job_runs")
    .update({
      status: params.status,
      duration_ms: durationMs,
      result_payload: params.resultPayload ?? {},
      error_payload: params.errorPayload ?? {},
      source_event_ids: params.sourceEventIds ?? [],
      created_alert_ids: params.createdAlertIds ?? [],
      created_review_case_ids: params.createdReviewCaseIds ?? [],
      scanned_object_counts: params.scannedObjectCounts ?? {},
      mutation_counts: params.mutationCounts ?? {},
      reason_codes: params.reasonCodes ?? [],
      metadata: params.metadata ?? {},
      ...timestampPatch,
      updated_at: now
    })
    .eq("job_run_id", params.jobRunId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
