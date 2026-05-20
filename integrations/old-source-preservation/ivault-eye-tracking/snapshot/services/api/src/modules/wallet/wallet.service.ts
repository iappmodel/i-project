import { createUserSupabaseClient } from "../../config/supabase";
import { decodeCursor, encodeCursor } from "../../shared/cursor";
import { mapWalletLedgerRow, mapWalletSummaryRow } from "./wallet.mapper";

export async function getWalletSummary(accessToken: string, userId: string) {
  const db = createUserSupabaseClient(accessToken);
  const { data, error } = await db
    .from("app_wallet_summary")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapWalletSummaryRow(data);
}

export async function getWalletLedger(
  accessToken: string,
  userId: string,
  limit = 50,
  cursor?: string
) {
  const db = createUserSupabaseClient(accessToken);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const fetchLimit = safeLimit + 1;

  let query = db
    .from("app_wallet_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("wallet_ledger_entry_id", { ascending: false })
    .limit(fetchLimit);

  if (cursor) {
    const decoded = decodeCursor(cursor);

    query = query.or(
      [
        `created_at.lt.${decoded.timestamp}`,
        `and(created_at.eq.${decoded.timestamp},wallet_ledger_entry_id.lt.${decoded.id})`
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, safeLimit);
  const hasNextPage = rows.length > safeLimit;
  const last = pageRows[pageRows.length - 1];

  return {
    items: pageRows.map(mapWalletLedgerRow),
    nextCursor:
      hasNextPage && last
        ? encodeCursor({
            timestamp: String(last.created_at),
            id: String(last.wallet_ledger_entry_id)
          })
        : null
  };
}
