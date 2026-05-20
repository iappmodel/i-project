import { describe, expect, it } from "vitest";
import { evaluateIdempotency } from "../idempotency-engine";
import type { IdempotencyKeyRecord } from "@/types/alphabet/idempotency.types";

function record(overrides: Partial<IdempotencyKeyRecord> = {}): IdempotencyKeyRecord {
  return {
    idempotencyKey: "idem_1",
    scope: "wallet_credit",
    status: "completed",
    userId: "user_1",
    objectId: "wallet_1",
    requestHash: "hash_1",
    responseSnapshot: {
      ok: true
    },
    linkedObjectIds: {},
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("idempotency-engine", () => {
  it("creates new key", () => {
    const result = evaluateIdempotency({
      idempotencyKey: "idem_1",
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      requestHash: "hash_1",
      existingRecord: null,
      financialMutation: true,
      allowReplay: true,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("idempotency_new");
    expect(result.safeToCreate).toBe(true);
  });

  it("replays completed same hash", () => {
    const result = evaluateIdempotency({
      idempotencyKey: "idem_1",
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      requestHash: "hash_1",
      existingRecord: record(),
      financialMutation: true,
      allowReplay: true,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("idempotency_replay");
    expect(result.safeToReplay).toBe(true);
  });

  it("conflicts on different hash", () => {
    const result = evaluateIdempotency({
      idempotencyKey: "idem_1",
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      requestHash: "hash_2",
      existingRecord: record(),
      financialMutation: true,
      allowReplay: true,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("idempotency_conflict");
    expect(result.conflict).toBe(true);
  });

  it("blocks missing key for financial mutation", () => {
    const result = evaluateIdempotency({
      idempotencyKey: null,
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      requestHash: "hash_1",
      existingRecord: null,
      financialMutation: true,
      allowReplay: true,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("idempotency_blocked");
  });

  it("detects in progress", () => {
    const result = evaluateIdempotency({
      idempotencyKey: "idem_1",
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      requestHash: "hash_1",
      existingRecord: record({ status: "in_progress" }),
      financialMutation: true,
      allowReplay: true,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("idempotency_in_progress");
  });
});
