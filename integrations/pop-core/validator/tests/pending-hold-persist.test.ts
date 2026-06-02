import { describe, expect, it } from "vitest";

import type { PendingHoldRecord } from "@pop-core/backend";

import { persistPendingHold } from "../src/pending-hold-persist.js";
import type { SupabaseSettlementClient } from "../src/supabase-settlement-client.js";

const sampleHold: PendingHoldRecord = {
  sessionId: "sess_persist_test",
  userId: null,
  localUserRef: "local_test",
  contentId: "content_1",
  offerId: "offer_1",
  artifactId: null,
  packetId: null,
  amount: 50,
  amountBreakdown: {
    computedAmountMinor: 50,
    currency: "ICOIN",
    offerId: "offer_1"
  },
  status: "pending",
  releaseStatus: "release_pending",
  createdAt: "2026-06-02T12:00:00.000Z",
  reviewAudit: {
    sessionId: "sess_persist_test",
    reviewedAt: "2026-06-02T12:00:00.000Z",
    reviewStatus: "approved",
    artifactId: null,
    packetId: null,
    lifecycleEventCount: 1
  },
  releaseEligibleAt: "2026-06-02T13:00:00.000Z",
  appealExpiresAt: null,
  reverifyUsed: false,
  trustTierAtHold: "t0_new"
};

function mockClient(overrides: Partial<SupabaseSettlementClient>): SupabaseSettlementClient {
  return {
    isEnabled: false,
    async upsertPendingHold() {
      return { outcome: "created" };
    },
    async settlePendingHold() {
      throw new Error("not used");
    },
    async getPendingHold() {
      return null;
    },
    async listPendingHolds() {
      return [];
    },
    async upsertPopsSession() {
      return { outcome: "created" };
    },
    async recordFraudEvent() {},
    ...overrides
  };
}

describe("persistPendingHold", () => {
  it("skips when hold is null", async () => {
    const client = mockClient({ isEnabled: true });
    const result = await persistPendingHold(null, client, "local-json");
    expect(result.outcome).toBe("skipped");
    expect(result.storeMode).toBe("local-json");
  });

  it("local-json mode swallows upsert errors", async () => {
    const client = mockClient({
      isEnabled: true,
      async upsertPendingHold() {
        throw new Error("db down");
      }
    });
    const result = await persistPendingHold(sampleHold, client, "local-json");
    expect(result.error).toMatch(/db down/);
    expect(result.outcome).toBe("skipped");
  });

  it("supabase-primary mode propagates upsert failures", async () => {
    const client = mockClient({
      isEnabled: true,
      async upsertPendingHold() {
        throw new Error("insert failed");
      }
    });
    await expect(
      persistPendingHold(sampleHold, client, "supabase-primary")
    ).rejects.toThrow(/insert failed/);
  });

  it("supabase-primary requires enabled client", async () => {
    const client = mockClient({ isEnabled: false });
    await expect(
      persistPendingHold(sampleHold, client, "supabase-primary")
    ).rejects.toThrow(/requires a configured Supabase client/);
  });
});
