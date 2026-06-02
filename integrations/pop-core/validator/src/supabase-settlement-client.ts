import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { PendingHoldRecord } from "@pop-core/backend";

import {
  pendingHoldToRow,
  readSupabaseSettlementConfig,
  type SupabaseSettlementConfig
} from "./supabase-settlement.js";
import type { PopsSessionRow } from "./pops-session-sync.js";

export interface SupabaseSettlementClient {
  isEnabled: boolean;
  upsertPendingHold(hold: PendingHoldRecord): Promise<{ outcome: "created" | "existing" }>;
  settlePendingHold(
    sessionId: string,
    userId: string
  ): Promise<Record<string, unknown>>;
  getPendingHold(sessionId: string): Promise<Record<string, unknown> | null>;
  listPendingHolds(localUserRef: string): Promise<Record<string, unknown>[]>;
  upsertPopsSession(row: PopsSessionRow): Promise<{ outcome: "created" | "existing" }>;
  recordFraudEvent(event: Record<string, unknown>): Promise<void>;
}

function createSupabaseClient(config: SupabaseSettlementConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function createSupabaseSettlementClient(
  config: SupabaseSettlementConfig | null = readSupabaseSettlementConfig()
): SupabaseSettlementClient {
  if (!config) {
    return {
      isEnabled: false,
      async upsertPendingHold() {
        return { outcome: "existing" as const };
      },
      async settlePendingHold() {
        throw new Error("Supabase settlement is not configured");
      },
      async getPendingHold() {
        return null;
      },
      async listPendingHolds() {
        return [];
      },
      async upsertPopsSession() {
        return { outcome: "existing" as const };
      },
      async recordFraudEvent() {}
    };
  }

  const client = createSupabaseClient(config);

  return {
    isEnabled: true,

    async upsertPendingHold(hold: PendingHoldRecord) {
      const row = pendingHoldToRow(hold);
      const { data: existing } = await client
        .from("pop_pending_holds")
        .select("session_id")
        .eq("session_id", row.session_id)
        .maybeSingle();

      if (existing) {
        return { outcome: "existing" as const };
      }

      const { error } = await client.from("pop_pending_holds").insert(row);
      if (error) {
        throw new Error(`pop_pending_holds insert failed: ${error.message}`);
      }

      return { outcome: "created" as const };
    },

    async settlePendingHold(sessionId: string, userId: string) {
      const { data, error } = await client.rpc("settle_pop_pending_hold", {
        p_session_id: sessionId,
        p_user_id: userId
      });

      if (error) {
        throw new Error(`settle_pop_pending_hold failed: ${error.message}`);
      }

      return (data ?? {}) as Record<string, unknown>;
    },

    async getPendingHold(sessionId: string) {
      const { data, error } = await client
        .from("pop_pending_holds")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (error) {
        throw new Error(`pop_pending_holds select failed: ${error.message}`);
      }

      return data as Record<string, unknown> | null;
    },

    async listPendingHolds(localUserRef: string) {
      const { data, error } = await client
        .from("pop_pending_holds")
        .select("*")
        .eq("local_user_ref", localUserRef)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`pop_pending_holds list failed: ${error.message}`);
      }

      return (data ?? []) as Record<string, unknown>[];
    },

    async upsertPopsSession(row: PopsSessionRow) {
      const { data: existing } = await client
        .from("pops_sessions")
        .select("session_id")
        .eq("session_id", row.session_id)
        .maybeSingle();

      if (existing) {
        return { outcome: "existing" as const };
      }

      const { error } = await client.from("pops_sessions").insert(row);
      if (error) {
        throw new Error(`pops_sessions insert failed: ${error.message}`);
      }

      return { outcome: "created" as const };
    },

    async recordFraudEvent(event: Record<string, unknown>) {
      const { error } = await client.from("pop_fraud_events").insert(event);
      if (error) {
        throw new Error(`pop_fraud_events insert failed: ${error.message}`);
      }
    }
  };
}
