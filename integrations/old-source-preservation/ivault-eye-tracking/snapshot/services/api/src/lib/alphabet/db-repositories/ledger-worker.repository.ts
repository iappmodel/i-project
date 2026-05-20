import { createServiceDbClient } from "../db-client";
import type { DbLedgerEntry, DbWalletAccount, Json } from "@/types/alphabet/database.types";
import { getOrCreateWalletAccountDb } from "./wallets.repository";
import {
  assertMutationAllowedDb,
  completeGuardedMutationDb
} from "../idempotency/idempotency-store";

export async function getWalletAccountForUpdateDb(params: {
  walletId: string;
  coinCode: string;
}): Promise<DbWalletAccount | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("wallet_accounts")
    .select("*")
    .eq("wallet_id", params.walletId)
    .eq("coin_code", params.coinCode)
    .maybeSingle();

  if (error) throw error;
  return data as DbWalletAccount | null;
}

export async function appendLedgerEntryAndUpdateBalanceDb(params: {
  walletId: string;
  userId: string;
  coinCode: string;
  direction: "credit" | "debit";
  amount: number;
  sourceType: string;
  sourceObjectId: string;
  sourceEventId?: string | null;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  reasonCode: string;
  metadata?: Json;
}): Promise<{
  ledgerEntry: DbLedgerEntry;
  walletAccount: DbWalletAccount;
}> {
  if (params.amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const db = createServiceDbClient();

  const guard = await assertMutationAllowedDb({
    scope: params.direction === "credit" ? "wallet_credit" : "wallet_debit",
    userId: params.userId,
    objectId: params.walletId,
    idempotencyKey: params.idempotencyKey ?? null,
    dedupeKey: params.dedupeKey ?? null,
    requestPayload: {
      walletId: params.walletId,
      userId: params.userId,
      coinCode: params.coinCode,
      direction: params.direction,
      amount: params.amount,
      sourceType: params.sourceType,
      sourceObjectId: params.sourceObjectId,
      reasonCode: params.reasonCode
    },
    financialMutation: true,
    metadata: {
      source: "ledger_worker"
    }
  });

  if (guard.replay && guard.responseSnapshot) {
    return guard.responseSnapshot as unknown as {
      ledgerEntry: DbLedgerEntry;
      walletAccount: DbWalletAccount;
    };
  }

  const account = await getOrCreateWalletAccountDb({
    walletId: params.walletId,
    userId: params.userId,
    coinCode: params.coinCode
  });

  if (params.direction === "debit" && account.available_balance < params.amount) {
    throw new Error("Insufficient available balance.");
  }

  const availableDelta = params.direction === "credit" ? params.amount : -params.amount;

  const { data: ledgerData, error: ledgerError } = await db
    .from("ledger_entries")
    .insert({
      wallet_id: params.walletId,
      wallet_account_id: account.wallet_account_id,
      user_id: params.userId,
      coin_code: params.coinCode,
      direction: params.direction,
      ledger_status: "posted",
      amount: params.amount,
      available_delta: availableDelta,
      pending_delta: 0,
      locked_delta: 0,
      source_type: params.sourceType,
      source_object_id: params.sourceObjectId,
      source_event_id: params.sourceEventId ?? null,
      idempotency_key: params.idempotencyKey ?? null,
      dedupe_key: params.dedupeKey ?? null,
      reason_code: params.reasonCode,
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (ledgerError) throw ledgerError;

  const nextAvailable = account.available_balance + availableDelta;

  const { data: accountData, error: accountError } = await db
    .from("wallet_accounts")
    .update({
      available_balance: nextAvailable,
      updated_at: new Date().toISOString()
    })
    .eq("wallet_account_id", account.wallet_account_id)
    .select("*")
    .single();

  if (accountError) throw accountError;

  const ledgerEntry = ledgerData as DbLedgerEntry;
  const walletAccount = accountData as DbWalletAccount;

  await completeGuardedMutationDb({
    idempotencyKey: params.idempotencyKey ?? null,
    dedupeKey: params.dedupeKey ?? null,
    releaseDedupe: false,
    responseSnapshot: { ledgerEntry, walletAccount } as unknown as Json,
    linkedObjectIds: {
      ledgerEntryId: ledgerEntry.ledger_entry_id
    },
    metadata: {
      source: "ledger_worker_completed"
    }
  });

  return {
    ledgerEntry,
    walletAccount
  };
}

export async function findValueLotBySourceLedgerEntryDb(params: {
  sourceLedgerEntryId: string;
}): Promise<{ value_lot_id: string } | null> {
  const db = createServiceDbClient();
  const { data, error } = await db
    .from("value_lots")
    .select("value_lot_id")
    .eq("source_ledger_entry_id", params.sourceLedgerEntryId)
    .maybeSingle();

  if (error) throw error;
  return data as { value_lot_id: string } | null;
}

export async function createValueLotForCreditDb(params: {
  walletId: string;
  walletAccountId: string;
  userId: string;
  coinCode: string;
  amount: number;
  sourceLedgerEntryId: string;
  sourceEventId?: string | null;
  metadata?: Json;
}): Promise<{ value_lot_id: string }> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("value_lots")
    .insert({
      wallet_id: params.walletId,
      wallet_account_id: params.walletAccountId,
      user_id: params.userId,
      coin_code: params.coinCode,
      original_amount: params.amount,
      remaining_amount: params.amount,
      lot_status: "available",
      source_ledger_entry_id: params.sourceLedgerEntryId,
      source_event_id: params.sourceEventId ?? null,
      metadata: params.metadata ?? {}
    })
    .select("value_lot_id")
    .single();

  if (error) throw error;
  return { value_lot_id: data.value_lot_id as string };
}
