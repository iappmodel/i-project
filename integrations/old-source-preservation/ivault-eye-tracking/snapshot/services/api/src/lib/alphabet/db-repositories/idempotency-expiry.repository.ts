import type { Json } from "@/types/alphabet/database.types";
import { createServiceDbClient } from "../db-client";

function staleCutoffIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

async function mergeUniqueRows(
  queries: Array<PromiseLike<{ data: unknown; error: { message: string } | null }>>,
  keyField: "idempotency_key" | "dedupe_key",
  limit: number
): Promise<Record<string, unknown>[]> {
  const results = await Promise.all(queries);
  for (const { error } of results) {
    if (error) throw error;
  }

  const byKey = new Map<string, Record<string, unknown>>();
  for (const { data } of results) {
    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      const k = String(row[keyField] ?? "");
      if (k) byKey.set(k, row);
    }
  }

  return Array.from(byKey.values()).slice(0, limit);
}

export async function fetchIdempotencyExpiryRowsDb(params?: { limit?: number }) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();
  const stale = staleCutoffIso();
  const cap = Math.min(500, (params?.limit ?? 250) * 2);
  const lim = params?.limit ?? 250;

  return mergeUniqueRows(
    [
      db.from("idempotency_keys").select("*").is("archived_at", null).lte("expires_at", now).limit(cap),
      db.from("idempotency_keys").select("*").is("archived_at", null).lt("last_seen_at", stale).limit(cap),
      db.from("idempotency_keys").select("*").is("archived_at", null).gt("conflict_count", 0).limit(cap),
      db.from("idempotency_keys").select("*").is("archived_at", null).gt("replay_count", 0).limit(cap),
      db
        .from("idempotency_keys")
        .select("*")
        .is("archived_at", null)
        .lte("lock_expires_at", now)
        .not("lock_expires_at", "is", null)
        .limit(cap)
    ],
    "idempotency_key",
    lim
  );
}

export async function fetchDedupeExpiryRowsDb(params?: { limit?: number }) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();
  const stale = staleCutoffIso();
  const cap = Math.min(500, (params?.limit ?? 250) * 2);
  const lim = params?.limit ?? 250;

  return mergeUniqueRows(
    [
      db.from("dedupe_keys").select("*").is("archived_at", null).lte("expires_at", now).limit(cap),
      db.from("dedupe_keys").select("*").is("archived_at", null).lt("last_seen_at", stale).limit(cap),
      db.from("dedupe_keys").select("*").is("archived_at", null).gt("conflict_count", 0).limit(cap),
      db.from("dedupe_keys").select("*").is("archived_at", null).gt("replay_count", 0).limit(cap),
      db
        .from("dedupe_keys")
        .select("*")
        .is("archived_at", null)
        .lte("lock_expires_at", now)
        .not("lock_expires_at", "is", null)
        .limit(cap)
    ],
    "dedupe_key",
    lim
  );
}

export async function insertIdempotencyExpiryResultDb(params: {
  expiryType: string;
  expiryScope: string;
  status: string;
  severity: string;

  keyId?: string | null;
  keyType: string;
  scope?: string | null;
  keyValue?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  keyStatus?: string | null;

  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  expiresAt?: string | null;
  lockedAt?: string | null;
  lockExpiresAt?: string | null;

  hitCount?: number;
  conflictCount?: number;
  replayCount?: number;

  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  ledgerEntryId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  reviewCaseId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  notificationId?: string | null;
  alphabetEventId?: string | null;

  shouldArchive: boolean;
  shouldSuppress: boolean;
  shouldAlert: boolean;
  shouldReview: boolean;
  shouldExpireLock: boolean;

  riskScores?: Json;
  evidence?: Json;
  redactedEvidence?: Json;

  sourceEventIds?: string[];
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];

  reasonCodes?: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("idempotency_dedupe_expiry_results")
    .insert({
      expiry_type: params.expiryType,
      expiry_scope: params.expiryScope,
      status: params.status,
      severity: params.severity,

      key_id: params.keyId ?? null,
      key_type: params.keyType,
      scope: params.scope ?? null,
      key_value: params.keyValue ?? null,
      object_type: params.objectType ?? null,
      object_id: params.objectId ?? null,
      key_status: params.keyStatus ?? null,

      first_seen_at: params.firstSeenAt ?? null,
      last_seen_at: params.lastSeenAt ?? null,
      expires_at: params.expiresAt ?? null,
      locked_at: params.lockedAt ?? null,
      lock_expires_at: params.lockExpiresAt ?? null,

      hit_count: params.hitCount ?? 0,
      conflict_count: params.conflictCount ?? 0,
      replay_count: params.replayCount ?? 0,

      user_id: params.userId ?? null,
      wallet_id: params.walletId ?? null,
      wallet_account_id: params.walletAccountId ?? null,
      ledger_entry_id: params.ledgerEntryId ?? null,
      external_transfer_id: params.externalTransferId ?? null,
      compensation_id: params.compensationId ?? null,
      review_case_id: params.reviewCaseId ?? null,
      policy_decision_id: params.policyDecisionId ?? null,
      pipeline_id: params.pipelineId ?? null,
      saga_id: params.sagaId ?? null,
      execution_request_id: params.executionRequestId ?? null,
      notification_id: params.notificationId ?? null,
      alphabet_event_id: params.alphabetEventId ?? null,

      should_archive: params.shouldArchive,
      should_suppress: params.shouldSuppress,
      should_alert: params.shouldAlert,
      should_review: params.shouldReview,
      should_expire_lock: params.shouldExpireLock,

      risk_scores: params.riskScores ?? {},
      evidence: params.evidence ?? {},
      redacted_evidence: params.redactedEvidence ?? {},

      source_event_ids: (params.sourceEventIds ?? []).map((id) => id).filter(Boolean),
      created_alert_ids: (params.createdAlertIds ?? []).map((id) => id).filter(Boolean),
      created_review_case_ids: (params.createdReviewCaseIds ?? []).map((id) => id).filter(Boolean),

      reason_codes: params.reasonCodes ?? [],
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function updateIdempotencyExpiryResultSidecarsDb(params: {
  expiryResultId: string;
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];
  reviewCaseId?: string | null;
}) {
  const db = createServiceDbClient();
  const patch: Record<string, unknown> = {};
  if (params.createdAlertIds !== undefined) patch.created_alert_ids = params.createdAlertIds;
  if (params.createdReviewCaseIds !== undefined) {
    patch.created_review_case_ids = params.createdReviewCaseIds;
  }
  if (params.reviewCaseId !== undefined) patch.review_case_id = params.reviewCaseId;

  if (Object.keys(patch).length === 0) return;

  const { error } = await db
    .from("idempotency_dedupe_expiry_results")
    .update(patch)
    .eq("expiry_result_id", params.expiryResultId);

  if (error) throw error;
}

export async function archiveIdempotencyKeyDb(params: {
  keyValue: string;
  reasonCodes: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("idempotency_keys")
    .update({
      archived_at: new Date().toISOString(),
      archive_reason_codes: params.reasonCodes,
      expiry_metadata: params.metadata ?? {}
    })
    .eq("idempotency_key", params.keyValue)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function suppressIdempotencyKeyDb(params: {
  keyValue: string;
  reasonCodes: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("idempotency_keys")
    .update({
      suppressed_at: new Date().toISOString(),
      suppression_reason_codes: params.reasonCodes,
      expiry_metadata: params.metadata ?? {}
    })
    .eq("idempotency_key", params.keyValue)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function expireIdempotencyLockDb(keyValue: string) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("idempotency_keys")
    .update({
      locked_at: null,
      lock_expires_at: null
    })
    .eq("idempotency_key", keyValue)
    .not("locked_at", "is", null)
    .lte("lock_expires_at", now)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function archiveDedupeKeyDb(params: {
  keyValue: string;
  reasonCodes: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("dedupe_keys")
    .update({
      archived_at: new Date().toISOString(),
      archive_reason_codes: params.reasonCodes,
      expiry_metadata: params.metadata ?? {}
    })
    .eq("dedupe_key", params.keyValue)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function suppressDedupeKeyDb(params: {
  keyValue: string;
  reasonCodes: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("dedupe_keys")
    .update({
      suppressed_at: new Date().toISOString(),
      suppression_reason_codes: params.reasonCodes,
      expiry_metadata: params.metadata ?? {}
    })
    .eq("dedupe_key", params.keyValue)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function expireDedupeLockDb(keyValue: string) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("dedupe_keys")
    .update({
      locked_at: null,
      lock_expires_at: null
    })
    .eq("dedupe_key", keyValue)
    .not("locked_at", "is", null)
    .lte("lock_expires_at", now)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}
