import { beforeEach, describe, expect, it } from "vitest";
import type { TrustImpactEvent } from "../../../types/alphabet/trust.types";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore,
  getTrustAuditHistory,
  getTrustFreezeFlags,
  resetTrustStoreForTests
} from "../trust-store";

function makeTrustEvent(
  overrides: Partial<TrustImpactEvent> = {}
): TrustImpactEvent {
  return {
    eventId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    eventType: "identity_verified",
    category: "identity",
    severity: "positive_large",
    sourceEventId: null,
    objectType: null,
    objectId: null,
    confidence: 1,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("trust-store", () => {
  beforeEach(() => {
    resetTrustStoreForTests();
  });

  it("creates trust score once per user", () => {
    const userId = crypto.randomUUID();

    const a = getOrCreateTrustScore(userId);
    const b = getOrCreateTrustScore(userId);

    expect(a).toEqual(b);
  });

  it("stores audit history after update", () => {
    const userId = crypto.randomUUID();

    const event = makeTrustEvent({
      userId,
      eventType: "identity_verified",
      category: "identity",
      severity: "positive_large"
    });

    applyTrustImpactEventToUser(event);

    const history = getTrustAuditHistory(userId);

    expect(history.length).toBe(1);
    expect(history[0]?.updated).toBe(true);
  });

  it("stores freeze flags after severe payment event", () => {
    const userId = crypto.randomUUID();

    const event = makeTrustEvent({
      userId,
      eventType: "chargeback_received",
      category: "payment",
      severity: "negative_severe"
    });

    applyTrustImpactEventToUser(event);

    const flags = getTrustFreezeFlags(userId);

    expect(flags.freezesWithdrawals).toBe(true);
    expect(flags.freezesConversions).toBe(true);
    expect(flags.freezesCreatorMonetization).toBe(true);
  });
});
