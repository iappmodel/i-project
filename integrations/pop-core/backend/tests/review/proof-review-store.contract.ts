import { describe, expect, it } from "vitest";
import { lifecycleEventFromDecision } from "../../review/proof-review-lifecycle.js";
import { projectProofPacketReview } from "../../review/proof-review-projector.js";
import {
  ProofReviewConflictError,
  type ProofReviewRecord,
  type ProofReviewStore
} from "../../review/proof-review-store.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";

export function buildProofReviewRecord(
  overrides: Partial<ProofReviewRecord> = {}
): ProofReviewRecord {
  const projection = projectProofPacketReview(pp000001Packet);
  const lifecycleEvents = overrides.lifecycleEvents ?? [
    lifecycleEventFromDecision(projection.decision)
  ];

  return {
    sessionId: pp000001Packet.sessionId,
    userId: pp000001Packet.userId,
    localUserRef: pp000001Packet.localUserRef,
    contentId: pp000001Packet.contentId,
    offerId: pp000001Packet.offerId,
    packetId: null,
    artifactId: null,
    submittedAt: "2026-05-23T12:00:00.000Z",
    reviewedAt: projection.review.reviewedAt!,
    status: projection.review.status,
    originalPacket: structuredClone(pp000001Packet),
    projectedPacket: projection.packet,
    batch: projection.batch,
    scoring: projection.scoring,
    decision: projection.decision,
    review: projection.review,
    lifecycleEvents,
    ...overrides
  };
}

export function runProofReviewStoreContract(
  name: string,
  createStore: () => ProofReviewStore
): void {
  describe(name, () => {
    it("saves and retrieves a record by sessionId", () => {
      const store = createStore();
      const record = buildProofReviewRecord();

      expect(store.save(record)).toBe(record);
      expect(store.getBySessionId(record.sessionId)).toEqual(record);
    });

    it("throws ProofReviewConflictError for duplicate sessionId", () => {
      const store = createStore();
      const record = buildProofReviewRecord();

      store.save(record);

      expect(() => store.save(record)).toThrow(ProofReviewConflictError);
      expect(() => store.save(record)).toThrow(
        `Proof review record already exists for sessionId: ${record.sessionId}`
      );
    });

    it("indexes artifactId and packetId as secondary lookups", () => {
      const store = createStore();
      const record = buildProofReviewRecord({
        artifactId: "PP-000001",
        packetId: "pkt-test-001"
      });

      store.save(record);

      expect(store.getByArtifactId("PP-000001")).toEqual(record);
      expect(store.getByPacketId("pkt-test-001")).toEqual(record);
    });

    it("returns null for missing secondary lookup keys", () => {
      const store = createStore();
      store.save(buildProofReviewRecord());

      expect(store.getByArtifactId("missing-artifact")).toBeNull();
      expect(store.getByPacketId("missing-packet")).toBeNull();
      expect(store.getBySessionId("missing-session")).toBeNull();
    });

    it("overwrites artifactId index on last write while sessionId stays unique", () => {
      const store = createStore();
      const first = buildProofReviewRecord({
        sessionId: "sess-first",
        artifactId: "PP-shared"
      });
      const second = buildProofReviewRecord({
        sessionId: "sess-second",
        artifactId: "PP-shared"
      });

      store.save(first);
      store.save(second);

      expect(store.getByArtifactId("PP-shared")).toEqual(second);
      expect(store.getBySessionId("sess-first")).toEqual(first);
      expect(store.getBySessionId("sess-second")).toEqual(second);
    });
  });
}
