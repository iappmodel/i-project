import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";

/** Where pending holds are authoritative in production. */
export type SettlementStoreMode = "local-json" | "supabase-primary";

/**
 * `POP_SETTLEMENT_PRIMARY=supabase` → Supabase is required for hold persistence.
 * Default `local-json` keeps file-backed validator stores (demo / offline).
 */
export function readSettlementStoreMode(
  supabase: SupabaseSettlementClient
): SettlementStoreMode {
  const raw = process.env.POP_SETTLEMENT_PRIMARY?.trim().toLowerCase();
  if (raw === "supabase" || raw === "supabase-primary") {
    if (!supabase.isEnabled) {
      throw new Error(
        "POP_SETTLEMENT_PRIMARY=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }
    return "supabase-primary";
  }
  return "local-json";
}

export function useInMemoryHoldStore(mode: SettlementStoreMode): boolean {
  return (
    mode === "supabase-primary" &&
    process.env.POP_SETTLEMENT_SKIP_LOCAL_JSON === "true"
  );
}
