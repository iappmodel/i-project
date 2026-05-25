import { describe, expect, it } from "vitest";

import type { PendingHoldRecord } from "@pop-core/backend";

import {
  mapPopCurrencyToLedger,
  pendingHoldToRow
} from "../src/supabase-settlement.js";

function sampleHold(overrides: Partial<PendingHoldRecord> = {}): PendingHoldRecord {
  return {
    sessionId: "sess_test_001",
    userId: null,
    localUserRef: "demo-user-001",
    contentId: "feed-card-1",
    offerId: "nike-pegasus-41-watch",
    packetId: null,
    artifactId: "PP-000001",
    amount: 100,
    amountBreakdown: {
      policyVersion: "SETTLEMENT_AMOUNT_POLICY_V1",
      currency: "ICOIN",
      offerId: "nike-pegasus-41-watch",
      baseRewardMinor: 100,
      statusMultiplier: 1,
      computedAmountMinor: 100
    },
    status: "pending",
    releaseStatus: "not_released",
    createdAt: "2026-05-25T12:00:00.000Z",
    reviewAudit: {
      sessionId: "sess_test_001",
      reviewedAt: "2026-05-25T12:00:00.000Z",
      reviewStatus: "approved",
      artifactId: "PP-000001",
      packetId: null,
      lifecycleEventCount: 1
    },
    ...overrides
  };
}

describe("mapPopCurrencyToLedger", () => {
  it("maps ICOIN to icoin", () => {
    expect(mapPopCurrencyToLedger("ICOIN")).toBe("icoin");
  });

  it("maps VICOIN to vicoin", () => {
    expect(mapPopCurrencyToLedger("VICOIN")).toBe("vicoin");
  });
});

describe("pendingHoldToRow", () => {
  it("builds idempotent ledger ref and ledger currency", () => {
    const row = pendingHoldToRow(sampleHold());

    expect(row.session_id).toBe("sess_test_001");
    expect(row.currency).toBe("icoin");
    expect(row.amount).toBe(100);
    expect(row.review_status).toBe("approved");
    expect(row.ledger_ref_id).toBe("pop_hold_sess_test_001");
    expect(row.hold_status).toBe("pending");
  });
});
