import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

function isMissingRelation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e.code === "42P01" || Boolean(e.message?.includes("does not exist"));
}

export async function insertWalletInvariantResultDb(params: {
  invariantType: string;
  scanScope: string;
  status: string;
  severity: string;

  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;

  ledgerEntryId?: string | null;
  originalLedgerEntryId?: string | null;
  reversalLedgerEntryId?: string | null;
  valueLotId?: string | null;

  externalTransferId?: string | null;
  compensationId?: string | null;
  campaignId?: string | null;

  executionRequestId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;

  computedAvailableBalance?: number | null;
  computedPendingBalance?: number | null;
  computedReservedBalance?: number | null;
  computedTotalBalance?: number | null;

  storedAvailableBalance?: number | null;
  storedPendingBalance?: number | null;
  storedReservedBalance?: number | null;
  storedTotalBalance?: number | null;

  availableDelta?: number | null;
  pendingDelta?: number | null;
  reservedDelta?: number | null;
  totalDelta?: number | null;

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
    .from("wallet_invariant_results")
    .insert({
      invariant_type: params.invariantType,
      scan_scope: params.scanScope,
      status: params.status,
      severity: params.severity,

      user_id: params.userId ?? null,
      wallet_id: params.walletId ?? null,
      wallet_account_id: params.walletAccountId ?? null,

      ledger_entry_id: params.ledgerEntryId ?? null,
      original_ledger_entry_id: params.originalLedgerEntryId ?? null,
      reversal_ledger_entry_id: params.reversalLedgerEntryId ?? null,
      value_lot_id: params.valueLotId ?? null,

      external_transfer_id: params.externalTransferId ?? null,
      compensation_id: params.compensationId ?? null,
      campaign_id: params.campaignId ?? null,

      execution_request_id: params.executionRequestId ?? null,
      pipeline_id: params.pipelineId ?? null,
      saga_id: params.sagaId ?? null,

      computed_available_balance: params.computedAvailableBalance ?? null,
      computed_pending_balance: params.computedPendingBalance ?? null,
      computed_reserved_balance: params.computedReservedBalance ?? null,
      computed_total_balance: params.computedTotalBalance ?? null,

      stored_available_balance: params.storedAvailableBalance ?? null,
      stored_pending_balance: params.storedPendingBalance ?? null,
      stored_reserved_balance: params.storedReservedBalance ?? null,
      stored_total_balance: params.storedTotalBalance ?? null,

      available_delta: params.availableDelta ?? null,
      pending_delta: params.pendingDelta ?? null,
      reserved_delta: params.reservedDelta ?? null,
      total_delta: params.totalDelta ?? null,

      risk_scores: params.riskScores ?? {},
      evidence: params.evidence ?? {},
      redacted_evidence: params.redactedEvidence ?? {},

      source_event_ids: params.sourceEventIds ?? [],
      created_alert_ids: params.createdAlertIds ?? [],
      created_review_case_ids: params.createdReviewCaseIds ?? [],

      reason_codes: params.reasonCodes ?? [],
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateWalletInvariantResultSidecarsDb(params: {
  invariantResultId: string;
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];
  sourceEventIds?: string[];
}) {
  const db = createServiceDbClient();
  const patch: Record<string, unknown> = {};
  if (params.createdAlertIds !== undefined) patch.created_alert_ids = params.createdAlertIds;
  if (params.createdReviewCaseIds !== undefined) patch.created_review_case_ids = params.createdReviewCaseIds;
  if (params.sourceEventIds !== undefined) patch.source_event_ids = params.sourceEventIds;

  if (Object.keys(patch).length === 0) return;

  const { error } = await db.from("wallet_invariant_results").update(patch).eq("invariant_result_id", params.invariantResultId);

  if (error) throw error;
}

export async function listWalletAccountsForInvariantScanDb(params?: {
  limit?: number;
  cursorWalletAccountId?: string | null;
}) {
  const db = createServiceDbClient();

  let query = db
    .from("wallet_accounts")
    .select("*")
    .order("wallet_account_id", { ascending: true })
    .limit(params?.limit ?? 250);

  if (params?.cursorWalletAccountId) {
    query = query.gt("wallet_account_id", params.cursorWalletAccountId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function listWalletAccountsByWalletIdDb(walletId: string) {
  const db = createServiceDbClient();
  const { data, error } = await db
    .from("wallet_accounts")
    .select("*")
    .eq("wallet_id", walletId)
    .order("wallet_account_id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchLedgerEntriesForWalletDb(walletId: string) {
  const db = createServiceDbClient();
  const { data, error } = await db
    .from("ledger_entries")
    .select("*")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchWalletAccountInvariantBundleDb(walletAccountId: string) {
  const db = createServiceDbClient();

  const accountResult = await db
    .from("wallet_accounts")
    .select("*")
    .eq("wallet_account_id", walletAccountId)
    .single();

  if (accountResult.error) throw accountResult.error;

  const account = accountResult.data;

  const walletPromise = db.from("wallets").select("*").eq("wallet_id", account.wallet_id).maybeSingle();

  const ledgersPromise = db
    .from("ledger_entries")
    .select("*")
    .eq("wallet_account_id", walletAccountId)
    .order("created_at", { ascending: true });

  const valueLotsPromise = db
    .from("value_lots")
    .select("*")
    .eq("wallet_account_id", walletAccountId)
    .order("created_at", { ascending: true });

  const externalTransfersPromise = db
    .from("external_transfers")
    .select("*")
    .eq("wallet_account_id", walletAccountId)
    .order("created_at", { ascending: true });

  const compensationsPromise = db
    .from("compensation_records")
    .select("*")
    .eq("original_wallet_account_id", walletAccountId)
    .order("created_at", { ascending: true });

  const siblingAccountsPromise = listWalletAccountsByWalletIdDb(account.wallet_id);
  const walletLedgersPromise = fetchLedgerEntriesForWalletDb(account.wallet_id);

  const [
    wallet,
    ledgers,
    valueLots,
    externalTransfers,
    compensations,
    siblingAccounts,
    walletLedgers
  ] = await Promise.all([
    walletPromise,
    ledgersPromise,
    valueLotsPromise,
    externalTransfersPromise,
    compensationsPromise,
    siblingAccountsPromise,
    walletLedgersPromise
  ]);

  if (wallet.error && !isMissingRelation(wallet.error)) throw wallet.error;
  if (ledgers.error) throw ledgers.error;
  if (valueLots.error && !isMissingRelation(valueLots.error)) throw valueLots.error;
  if (externalTransfers.error && !isMissingRelation(externalTransfers.error)) {
    throw externalTransfers.error;
  }
  if (compensations.error && !isMissingRelation(compensations.error)) throw compensations.error;

  return {
    walletAccount: account,
    wallet: wallet.data,
    ledgers: ledgers.data ?? [],
    valueLots: valueLots.error && isMissingRelation(valueLots.error) ? [] : (valueLots.data ?? []),
    externalTransfers:
      externalTransfers.error && isMissingRelation(externalTransfers.error)
        ? []
        : (externalTransfers.data ?? []),
    compensations:
      compensations.error && isMissingRelation(compensations.error) ? [] : (compensations.data ?? []),
    siblingAccounts,
    walletLedgers
  };
}

export async function fetchCampaignBudgetRowDb(campaignId: string): Promise<Record<string, unknown> | null> {
  const db = createServiceDbClient();
  const { data, error } = await db
    .from("campaign_budget_accounts")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
  return (data as Record<string, unknown> | null) ?? null;
}
