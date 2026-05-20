import { describe, expect, it } from "vitest";
import { evaluateMutationGuard } from "../mutation-guard";
import type { DedupeKeyRecord, IdempotencyKeyRecord } from "@/types/alphabet/idempotency.types";

function idem(status: IdempotencyKeyRecord["status"] = "completed"): IdempotencyKeyRecord {
  return {
    idempotencyKey: "idem_1",
    scope: "wallet_credit",
    status,
    userId: "user_1",
    objectId: "wallet_1",
    requestHash: "hash_1",
    responseSnapshot: { ok: true },
    linkedObjectIds: {},
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    metadata: {}
  };
}

function dedupe(status: DedupeKeyRecord["status"] = "released"): DedupeKeyRecord {
  return {
    dedupeKey: "dedupe_1",
    scope: "wallet_credit",
    status,
    userId: "user_1",
    objectId: "wallet_1",
    duplicateCount: 0,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    metadata: {}
  };
}

describe("mutation-guard", () => {
  it("allows new mutation with both keys", () => {
    const result = evaluateMutationGuard({
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      idempotencyKey: "idem_1",
      dedupeKey: "dedupe_1",
      requestHash: "hash_1",
      financialMutation: true,
      allowReplay: true,
      blockDuplicate: true,
      existingIdempotencyRecord: null,
      existingDedupeRecord: null,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("mutation_allowed");
    expect(result.allowed).toBe(true);
  });

  it("allows replay for same completed idempotency key", () => {
    const result = evaluateMutationGuard({
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      idempotencyKey: "idem_1",
      dedupeKey: "dedupe_1",
      requestHash: "hash_1",
      financialMutation: true,
      allowReplay: true,
      blockDuplicate: true,
      existingIdempotencyRecord: idem("completed"),
      existingDedupeRecord: dedupe("released"),
      now: new Date().toISOString()
    });

    expect(result.status).toBe("mutation_replay");
    expect(result.replay).toBe(true);
  });

  it("blocks conflict for same idempotency key different hash", () => {
    const result = evaluateMutationGuard({
      scope: "wallet_credit",
      userId: "user_1",
      objectId: "wallet_1",
      idempotencyKey: "idem_1",
      dedupeKey: "dedupe_1",
      requestHash: "hash_2",
      financialMutation: true,
      allowReplay: true,
      blockDuplicate: true,
      existingIdempotencyRecord: idem("completed"),
      existingDedupeRecord: dedupe("released"),
      now: new Date().toISOString()
    });

    expect(result.status).toBe("mutation_blocked_conflict");
  });

  it("blocks active dedupe duplicate", () => {
    const activeDedupe = dedupe("active");
    activeDedupe.scope = "withdrawal";

    const result = evaluateMutationGuard({
      scope: "withdrawal",
      userId: "user_1",
      objectId: "wallet_1",
      idempotencyKey: "idem_2",
      dedupeKey: "dedupe_1",
      requestHash: "hash_2",
      financialMutation: true,
      allowReplay: true,
      blockDuplicate: true,
      existingIdempotencyRecord: null,
      existingDedupeRecord: activeDedupe,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("mutation_blocked_duplicate");
  });

  it("blocks missing keys for financial mutation", () => {
    const result = evaluateMutationGuard({
      scope: "wallet_debit",
      userId: "user_1",
      objectId: "wallet_1",
      idempotencyKey: null,
      dedupeKey: null,
      requestHash: "hash_1",
      financialMutation: true,
      allowReplay: true,
      blockDuplicate: true,
      existingIdempotencyRecord: null,
      existingDedupeRecord: null,
      now: new Date().toISOString()
    });

    expect(result.status).toBe("mutation_blocked_missing_key");
  });
});
