import { beforeEach, describe, expect, it } from "vitest";
import type { UValueImpactEvent } from "../../../types/alphabet/u-value.types";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState,
  getUValueAuditHistory,
  resetUValueStoreForTests
} from "../u-value-store";

function makeEvent(
  overrides: Partial<UValueImpactEvent> = {}
): UValueImpactEvent {
  return {
    eventId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    eventType: "learning_verified",
    category: "learning",
    severity: "positive_medium",
    coinCode: "L",
    sourceEventId: null,
    objectType: null,
    objectId: null,
    confidence: 1,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("u-value-store", () => {
  beforeEach(() => {
    resetUValueStoreForTests();
  });

  it("creates U Value state once per user", () => {
    const userId = crypto.randomUUID();
    const a = getOrCreateUValueState(userId);
    const b = getOrCreateUValueState(userId);
    expect(a).toEqual(b);
  });

  it("stores audit history after update", () => {
    const userId = crypto.randomUUID();
    const event = makeEvent({
      userId,
      eventType: "learning_verified",
      category: "learning",
      severity: "positive_medium"
    });

    applyUValueImpactEventToUser(event);

    const history = getUValueAuditHistory(userId);
    expect(history.length).toBe(1);
    expect(history[0]?.updated).toBe(true);
  });
});
