import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function insertProviderReconciliationRecordDb(params: {
  reconciliationSource: string;
  provider: string;
  normalizedProviderStatus: string;
  reconciliationStatus: string;
  externalTransferId?: string | null;
  providerTransferId?: string | null;
  providerEventId?: string | null;
  providerRawEventType?: string | null;
  providerRawPayload?: Json;
  sanitizedProviderPayload?: Json;
  signatureVerified?: boolean;
  signatureConfidenceScore?: number;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  sourceEventIds?: string[];
  replayDetected?: boolean;
  pollingAttemptCount?: number;
  riskScores?: Json;
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("provider_reconciliation_records")
    .insert({
      reconciliation_source: params.reconciliationSource,
      provider: params.provider,
      normalized_provider_status: params.normalizedProviderStatus,
      reconciliation_status: params.reconciliationStatus,
      external_transfer_id: params.externalTransferId ?? null,
      provider_transfer_id: params.providerTransferId ?? null,
      provider_event_id: params.providerEventId ?? null,
      provider_raw_event_type: params.providerRawEventType ?? null,
      provider_raw_payload: params.providerRawPayload ?? {},
      sanitized_provider_payload: params.sanitizedProviderPayload ?? {},
      signature_verified: params.signatureVerified ?? false,
      signature_confidence_score: params.signatureConfidenceScore ?? 0,
      idempotency_key: params.idempotencyKey ?? null,
      dedupe_key: params.dedupeKey ?? null,
      source_event_ids: params.sourceEventIds ?? [],
      replay_detected: params.replayDetected ?? false,
      polling_attempt_count: params.pollingAttemptCount ?? 0,
      risk_scores: params.riskScores ?? {},
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getProviderReconciliationByEventDb(params: {
  provider: string;
  providerEventId: string;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("provider_reconciliation_records")
    .select("*")
    .eq("provider", params.provider)
    .eq("provider_event_id", params.providerEventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProviderReconciliationRecordDb(params: {
  reconciliationId: string;
  reconciliationStatus: string;
  metadata?: Json;
}) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const timestamps: Record<string, string> = {};

  if (params.reconciliationStatus === "reconciliation_verified") timestamps.verified_at = now;
  if (params.reconciliationStatus === "reconciliation_matched") timestamps.matched_at = now;
  if (params.reconciliationStatus === "reconciliation_applied") timestamps.applied_at = now;
  if (params.reconciliationStatus === "reconciliation_ignored") timestamps.ignored_at = now;
  if (params.reconciliationStatus === "reconciliation_requires_review") timestamps.requires_review_at = now;
  if (params.reconciliationStatus === "reconciliation_failed") timestamps.failed_at = now;

  const { data, error } = await db
    .from("provider_reconciliation_records")
    .update({
      reconciliation_status: params.reconciliationStatus,
      ...(params.metadata ? { metadata: params.metadata } : {}),
      ...timestamps,
      updated_at: now
    })
    .eq("reconciliation_id", params.reconciliationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listPendingExternalTransfersForPollingDb(params: {
  provider?: string | null;
  limit?: number;
}) {
  const db = createServiceDbClient();

  let query = db
    .from("external_transfers")
    .select("*")
    .in("status", ["provider_pending", "provider_request_sent", "provider_request_created"])
    .order("updated_at", { ascending: true })
    .limit(params.limit ?? 25);

  if (params.provider) {
    query = query.eq("provider", params.provider);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}
