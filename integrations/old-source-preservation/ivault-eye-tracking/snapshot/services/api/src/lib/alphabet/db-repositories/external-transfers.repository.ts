import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function insertExternalTransferDb(params: {
  transferType: string;
  provider: string;
  status: string;

  userId: string;
  walletId?: string | null;
  walletAccountId?: string | null;

  originalExecutionRequestId?: string | null;
  originalLedgerEntryId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;

  amount: number;
  coinCode: string;

  fiatAmount?: number | null;
  fiatCurrency?: string | null;

  providerTransferId?: string | null;
  providerStatus?: string | null;

  providerPayload?: Json;
  providerResponse?: Json;

  destinationType?: string | null;
  destinationLabel?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds?: string[];

  riskScores?: Json;
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("external_transfers")
    .insert({
      transfer_type: params.transferType,
      provider: params.provider,
      status: params.status,
      user_id: params.userId,
      wallet_id: params.walletId ?? null,
      wallet_account_id: params.walletAccountId ?? null,
      original_execution_request_id: params.originalExecutionRequestId ?? null,
      original_ledger_entry_id: params.originalLedgerEntryId ?? null,
      pipeline_id: params.pipelineId ?? null,
      saga_id: params.sagaId ?? null,
      amount: params.amount,
      coin_code: params.coinCode,
      fiat_amount: params.fiatAmount ?? null,
      fiat_currency: params.fiatCurrency ?? null,
      provider_transfer_id: params.providerTransferId ?? null,
      provider_status: params.providerStatus ?? null,
      provider_payload: params.providerPayload ?? {},
      provider_response: params.providerResponse ?? {},
      destination_type: params.destinationType ?? null,
      destination_label: params.destinationLabel ?? null,
      idempotency_key: params.idempotencyKey ?? null,
      dedupe_key: params.dedupeKey ?? null,
      source_event_ids: params.sourceEventIds ?? [],
      risk_scores: params.riskScores ?? {},
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getExternalTransferDb(externalTransferId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("external_transfers")
    .select("*")
    .eq("external_transfer_id", externalTransferId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getExternalTransferByProviderTransferIdDb(providerTransferId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("external_transfers")
    .select("*")
    .eq("provider_transfer_id", providerTransferId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateExternalTransferDb(params: {
  externalTransferId: string;
  status?: string;
  providerTransferId?: string | null;
  providerStatus?: string | null;
  providerResponse?: Json;
  metadata?: Json;
}) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const statusTimestamps: Record<string, string> = {};

  if (params.status === "transfer_validating") statusTimestamps.validating_at = now;
  if (params.status === "provider_request_created") statusTimestamps.provider_request_created_at = now;
  if (params.status === "provider_request_sent") statusTimestamps.provider_request_sent_at = now;
  if (params.status === "provider_pending") statusTimestamps.provider_pending_at = now;
  if (params.status === "provider_succeeded") statusTimestamps.provider_succeeded_at = now;
  if (params.status === "provider_failed") statusTimestamps.provider_failed_at = now;
  if (params.status === "provider_unknown") statusTimestamps.provider_unknown_at = now;
  if (params.status === "transfer_completed") statusTimestamps.completed_at = now;
  if (params.status === "transfer_failed") statusTimestamps.failed_at = now;
  if (params.status === "transfer_requires_review") statusTimestamps.requires_review_at = now;

  const { data, error } = await db
    .from("external_transfers")
    .update({
      ...(params.status ? { status: params.status } : {}),
      ...(params.providerTransferId !== undefined
        ? { provider_transfer_id: params.providerTransferId }
        : {}),
      ...(params.providerStatus !== undefined ? { provider_status: params.providerStatus } : {}),
      ...(params.providerResponse !== undefined
        ? { provider_response: params.providerResponse }
        : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
      ...statusTimestamps,
      updated_at: now
    })
    .eq("external_transfer_id", params.externalTransferId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
