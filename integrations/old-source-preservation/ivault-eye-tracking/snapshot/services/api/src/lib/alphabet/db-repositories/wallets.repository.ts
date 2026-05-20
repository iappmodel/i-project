import { createServiceDbClient } from "../db-client";
import type { DbWalletAccount } from "@/types/alphabet/database.types";

export async function getOrCreateWalletAccountDb(params: {
  walletId: string;
  userId: string;
  coinCode: string;
}): Promise<DbWalletAccount> {
  const db = createServiceDbClient();

  const { data: existing, error: readError } = await db
    .from("wallet_accounts")
    .select("*")
    .eq("wallet_id", params.walletId)
    .eq("coin_code", params.coinCode)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing as DbWalletAccount;

  const { data, error } = await db
    .from("wallet_accounts")
    .insert({
      wallet_id: params.walletId,
      user_id: params.userId,
      coin_code: params.coinCode,
      available_balance: 0,
      pending_balance: 0,
      locked_balance: 0
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbWalletAccount;
}
