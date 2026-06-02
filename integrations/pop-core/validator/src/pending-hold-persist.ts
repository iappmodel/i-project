import type { PendingHoldRecord } from "@pop-core/backend";

import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";
import type { SettlementStoreMode } from "./settlement-store-mode.js";
import type { SettlementSyncResult } from "./settle-handler.js";

/**
 * Persist a pending hold to the configured durable store.
 * Supabase-primary mode treats upsert failure as fatal (production path).
 */
export async function persistPendingHold(
  hold: PendingHoldRecord | null | undefined,
  client: SupabaseSettlementClient,
  mode: SettlementStoreMode
): Promise<SettlementSyncResult & { storeMode: SettlementStoreMode }> {
  if (!hold) {
    return { enabled: client.isEnabled, outcome: "skipped", storeMode: mode };
  }

  if (mode === "local-json") {
    if (!client.isEnabled) {
      return { enabled: false, outcome: "skipped", storeMode: mode };
    }
    try {
      const result = await client.upsertPendingHold(hold);
      return { enabled: true, outcome: result.outcome, storeMode: mode };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Supabase error";
      return { enabled: true, outcome: "skipped", error: message, storeMode: mode };
    }
  }

  if (!client.isEnabled) {
    throw new Error("Supabase-primary settlement requires a configured Supabase client");
  }

  const result = await client.upsertPendingHold(hold);
  return { enabled: true, outcome: result.outcome, storeMode: mode };
}
