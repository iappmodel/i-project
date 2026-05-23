import { describe, expect, it } from "vitest";
import { createPendingHoldFromReview } from "../../settlement/pending-hold-service.js";
import { toReviewAudit, type PendingHoldRecord } from "../../settlement/pending-hold.js";
import {
  PendingHoldConflictError,
  type PendingHoldStore
} from "../../settlement/pending-hold-store.js";
import { buildProofReviewRecord } from "../review/proof-review-store.contract.js";

export function buildPendingHoldRecord(
  overrides: Partial<PendingHoldRecord> = {}
): PendingHoldRecord {
  const reviewRecord = buildProofReviewRecord();
  const createdAt = overrides.createdAt ?? "2026-05-23T12:01:00.000Z";

  return {
    sessionId: reviewRecord.sessionId,
    userId: reviewRecord.userId,
    localUserRef: reviewRecord.localUserRef,
    contentId: reviewRecord.contentId,
    offerId: reviewRecord.offerId,
    packetId: reviewRecord.packetId ?? null,
    artifactId: reviewRecord.artifactId ?? null,
    amount: null,
    status: "pending",
    releaseStatus: "not_released",
    createdAt,
    reviewAudit: toReviewAudit(reviewRecord),
    ...overrides
  };
}

export function runPendingHoldStoreContract(
  name: string,
  createStore: () => PendingHoldStore
): void {
  describe(name, () => {
    it("saves and retrieves a record by sessionId", () => {
      const store = createStore();
      const record = buildPendingHoldRecord();

      expect(store.save(record)).toBe(record);
      expect(store.getBySessionId(record.sessionId)).toEqual(record);
    });

    it("throws PendingHoldConflictError for duplicate sessionId", () => {
      const store = createStore();
      const record = buildPendingHoldRecord();

      store.save(record);

      expect(() => store.save(record)).toThrow(PendingHoldConflictError);
      expect(() => store.save(record)).toThrow(
        `Pending hold record already exists for sessionId: ${record.sessionId}`
      );
    });

    it("returns null for missing sessionId", () => {
      const store = createStore();
      store.save(buildPendingHoldRecord());

      expect(store.getBySessionId("missing-session")).toBeNull();
    });
  });
}

export function buildPartialProofReviewRecord() {
  const record = buildProofReviewRecord();
  return buildProofReviewRecord({
    status: "partial",
    review: {
      ...record.review,
      status: "partial",
      reasons: ["partial_thresholds_met"]
    }
  });
}

export function createHoldFromReviewRecord(
  record = buildProofReviewRecord(),
  options?: { createdAt?: string; store?: PendingHoldStore }
) {
  return createPendingHoldFromReview(record, options);
}
