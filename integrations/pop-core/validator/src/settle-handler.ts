import type { PendingHoldRecord } from "@pop-core/backend";

import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";

export interface SettlementSyncResult {
  enabled: boolean;
  outcome?: "created" | "existing" | "skipped";
  error?: string;
}

export async function syncPendingHoldToSupabase(
  hold: PendingHoldRecord | null | undefined,
  client: SupabaseSettlementClient
): Promise<SettlementSyncResult> {
  if (!hold) {
    return { enabled: client.isEnabled, outcome: "skipped" };
  }

  if (!client.isEnabled) {
    return { enabled: false, outcome: "skipped" };
  }

  try {
    const result = await client.upsertPendingHold(hold);
    return { enabled: true, outcome: result.outcome };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Supabase error";
    return { enabled: true, outcome: "skipped", error: message };
  }
}

export interface SettleHoldRequestBody {
  userId: string;
}

export interface SettleHoldResponse {
  sessionId: string;
  settlement: Record<string, unknown>;
}

export async function settleHoldViaSupabase(
  sessionId: string,
  userId: string,
  client: SupabaseSettlementClient
): Promise<SettleHoldResponse> {
  if (!client.isEnabled) {
    throw new Error("Supabase settlement is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
  }

  const settlement = await client.settlePendingHold(sessionId, userId);
  return { sessionId, settlement };
}
