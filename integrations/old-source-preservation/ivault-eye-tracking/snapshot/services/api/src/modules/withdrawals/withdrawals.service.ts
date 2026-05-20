import { createUserSupabaseClient, supabaseAdmin } from "../../config/supabase";
import { decodeCursor, encodeCursor } from "../../shared/cursor";
import { mapWithdrawalSummaryRow } from "./withdrawals.mapper";

export async function createWithdrawal(input: {
  userId: string;
  walletId: string;
  amountMinor: number;
  currencyCode: "USD";
  providerKey: string;
  idempotencyKey: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: withdrawalId, error } = await supabaseAdmin.rpc("create_withdrawal_request", {
    p_user_id: input.userId,
    p_wallet_id: input.walletId,
    p_requested_amount_minor: input.amountMinor,
    p_provider_key: input.providerKey,
    p_processor_fee_minor: 0,
    p_currency_code: input.currencyCode,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: {
      requestId: input.requestId,
      ...(input.metadata ?? {})
    }
  });

  if (error) {
    throw error;
  }

  const { data: row, error: readError } = await supabaseAdmin
    .from("app_withdrawal_summary")
    .select("*")
    .eq("withdrawal_request_id", withdrawalId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  return {
    withdrawalRequestId: String(withdrawalId),
    status: row?.status ?? "approved"
  };
}

export async function getWithdrawal(accessToken: string, userId: string, withdrawalRequestId: string) {
  const db = createUserSupabaseClient(accessToken);

  const { data, error } = await db
    .from("app_withdrawal_summary")
    .select("*")
    .eq("user_id", userId)
    .eq("withdrawal_request_id", withdrawalRequestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapWithdrawalSummaryRow(data) : null;
}

export async function getWithdrawalHistory(accessToken: string, userId: string, limit = 50, cursor?: string) {
  const db = createUserSupabaseClient(accessToken);

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const fetchLimit = safeLimit + 1;

  let query = db
    .from("app_withdrawal_summary")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("withdrawal_request_id", { ascending: false })
    .limit(fetchLimit);

  if (cursor) {
    const decoded = decodeCursor(cursor);

    query = query.or(
      [
        `created_at.lt.${decoded.timestamp}`,
        `and(created_at.eq.${decoded.timestamp},withdrawal_request_id.lt.${decoded.id})`
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
    items: pageRows.map(mapWithdrawalSummaryRow),
    nextCursor:
      hasNextPage && last
        ? encodeCursor({
            timestamp: String(last.created_at),
            id: String(last.withdrawal_request_id)
          })
        : null
  };
}
