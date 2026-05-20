import { describe, expect, it } from "vitest";
import { evaluateDedupe } from "../dedupe-engine";
import type { DedupeKeyRecord } from "@/types/alphabet/idempotency.types";

function record(overrides: Partial<DedupeKeyRecord> = {}): DedupeKeyRecord {
  return {
    dedupeKey: "dedupe_1",
    scope: "withdrawal",
    status: "active",
    userId: "user_1",
    objectId: "wallet_1",
    duplicateCount: 0,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("dedupe-engine", () => {
  it("creates new dedupe key", () => {
    const result = evaluateDedupe({
      dedupeKey: "dedupe_1",
      scope: "withdrawal",
      userId: "user_1",
      objectId: "wallet_1",
      existingRecord: null,
      financialMutation: true,
      blockWhileActive: true,
      releaseRequested: false,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("dedupe_new");
    expect(result.safeToCreate).toBe(true);
  });

  it("detects duplicate active key", () => {
    const result = evaluateDedupe({
      dedupeKey: "dedupe_1",
      scope: "withdrawal",
      userId: "user_1",
      objectId: "wallet_1",
      existingRecord: record(),
      financialMutation: true,
      blockWhileActive: true,
      releaseRequested: false,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("dedupe_duplicate");
    expect(result.duplicate).toBe(true);
  });

  it("blocks missing key for financial mutation", () => {
    const result = evaluateDedupe({
      dedupeKey: null,
      scope: "withdrawal",
      userId: "user_1",
      objectId: "wallet_1",
      existingRecord: null,
      financialMutation: true,
      blockWhileActive: true,
      releaseRequested: false,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("dedupe_blocked");
  });

  it("releases existing dedupe key", () => {
    const result = evaluateDedupe({
      dedupeKey: "dedupe_1",
      scope: "withdrawal",
      userId: "user_1",
      objectId: "wallet_1",
      existingRecord: record(),
      financialMutation: true,
      blockWhileActive: true,
      releaseRequested: true,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("dedupe_released");
  });
});
