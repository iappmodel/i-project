import { createServiceDbClient } from "../db-client";
import type { DbLedgerEntry, Json } from "@/types/alphabet/database.types";
import { appendLedgerEntryAndUpdateBalanceDb } from "./ledger-worker.repository";

export async function getLedgerEntryDb(ledgerEntryId: string): Promise<DbLedgerEntry | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("ledger_entries")
    .select("*")
    .eq("ledger_entry_id", ledgerEntryId)
    .maybeSingle();

  if (error) throw error;
  return data as DbLedgerEntry | null;
}

export async function sumReversedAmountForLedgerEntryDb(originalLedgerEntryId: string): Promise<number> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("ledger_entries")
    .select("amount")
    .eq("source_type", "ledger_reversal")
    .eq("source_object_id", originalLedgerEntryId);

  if (error) throw error;

  return (data ?? []).reduce((sum, row) => {
    return sum + Number(row.amount ?? 0);
  }, 0);
}

export async function appendReversalLedgerEntryDb(params: {
  originalLedgerEntryId: string;
  amount: number;
  idempotencyKey: string;
  dedupeKey: string;
  reasonCode: string;
  metadata?: Json;
}): Promise<{
  ledgerEntry: DbLedgerEntry;
}> {
  const original = await getLedgerEntryDb(params.originalLedgerEntryId);
  if (!original) {
    throw new Error("Original ledger entry not found.");
  }

  const alreadyReversed = await sumReversedAmountForLedgerEntryDb(params.originalLedgerEntryId);
  const maxReversible = Number(original.amount) - alreadyReversed;

  if (params.amount <= 0) {
    throw new Error("Reversal amount must be greater than zero.");
  }

  if (params.amount > maxReversible) {
    throw new Error("Reversal amount exceeds remaining reversible amount.");
  }

  const reversalDirection = original.direction === "credit" ? "debit" : "credit";

  const { ledgerEntry, walletAccount: _wa } = await appendLedgerEntryAndUpdateBalanceDb({
    walletId: original.wallet_id,
    userId: original.user_id,
    coinCode: original.coin_code,
    direction: reversalDirection as "credit" | "debit",
    amount: params.amount,
    sourceType: "ledger_reversal",
    sourceObjectId: original.ledger_entry_id,
    sourceEventId: original.source_event_id,
    idempotencyKey: params.idempotencyKey,
    dedupeKey: params.dedupeKey,
    reasonCode: params.reasonCode,
    metadata: {
      originalLedgerEntryId: original.ledger_entry_id,
      originalDirection: original.direction,
      reversalDirection,
      ...(params.metadata as Record<string, unknown> | undefined)
    }
  });

  return { ledgerEntry };
}
