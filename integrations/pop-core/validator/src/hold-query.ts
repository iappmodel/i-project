import {
  getLocalPendingHold,
  listLocalPendingHolds,
  settleLocalHoldDemo
} from "./local-hold-store.js";
import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";

export interface HoldListResult {
  source: "supabase" | "local";
  holds: Record<string, unknown>[];
}

export async function listPendingHoldsForUser(
  dataDir: string,
  localUserRef: string,
  supabase: SupabaseSettlementClient
): Promise<HoldListResult> {
  if (supabase.isEnabled) {
    const holds = await supabase.listPendingHolds(localUserRef);
    return { source: "supabase", holds };
  }

  return { source: "local", holds: listLocalPendingHolds(dataDir, localUserRef) };
}

export async function getPendingHoldBySessionId(
  dataDir: string,
  sessionId: string,
  supabase: SupabaseSettlementClient
): Promise<Record<string, unknown> | null> {
  if (supabase.isEnabled) {
    return supabase.getPendingHold(sessionId);
  }
  return getLocalPendingHold(dataDir, sessionId);
}

export interface SettleHoldResult {
  sessionId: string;
  source: "supabase" | "local";
  settlement: Record<string, unknown>;
}

export async function settlePendingHold(
  dataDir: string,
  sessionId: string,
  userId: string | null,
  supabase: SupabaseSettlementClient,
  mode: "production" | "demo"
): Promise<SettleHoldResult> {
  if (supabase.isEnabled && mode === "production") {
    if (!userId) {
      throw new Error("userId must be a valid UUID for Supabase settlement");
    }
    const settlement = await supabase.settlePendingHold(sessionId, userId);
    return { sessionId, source: "supabase", settlement };
  }

  const settlement = settleLocalHoldDemo(dataDir, sessionId);
  return {
    sessionId,
    source: "local",
    settlement: {
      success: true,
      code: "settled",
      mode: "demo",
      ...settlement
    }
  };
}
