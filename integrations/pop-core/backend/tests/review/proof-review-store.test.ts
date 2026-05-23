import { describe, expect, it } from "vitest";
import {
  InMemoryProofReviewStore,
  ProofReviewConflictError,
  type ProofReviewRecord
} from "../../review/proof-review-store.js";
import { lifecycleEventFromDecision } from "../../review/proof-review-lifecycle.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";
import { projectProofPacketReview } from "../../review/proof-review-projector.js";

function buildRecord(overrides: Partial<ProofReviewRecord> = {}): ProofReviewRecord {
  const projection = projectProofPacketReview(pp000001Packet);
  const lifecycleEvents = overrides.lifecycleEvents ?? [lifecycleEventFromDecision(projection.decision)];

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

describe("InMemoryProofReviewStore", () => {
  it("saves and retrieves a record by sessionId", () => {
    const store = new InMemoryProofReviewStore();
    const record = buildRecord();

    expect(store.save(record)).toBe(record);
    expect(store.getBySessionId(record.sessionId)).toBe(record);
  });

  it("throws ProofReviewConflictError for duplicate sessionId", () => {
    const store = new InMemoryProofReviewStore();
    const record = buildRecord();

    store.save(record);

    expect(() => store.save(record)).toThrow(ProofReviewConflictError);
    expect(() => store.save(record)).toThrow(
      `Proof review record already exists for sessionId: ${record.sessionId}`
    );
  });

  it("indexes artifactId and packetId as secondary lookups", () => {
    const store = new InMemoryProofReviewStore();
    const record = buildRecord({
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });

    store.save(record);

    expect(store.getByArtifactId("PP-000001")).toBe(record);
    expect(store.getByPacketId("pkt-test-001")).toBe(record);
  });

  it("returns null for missing secondary lookup keys", () => {
    const store = new InMemoryProofReviewStore();
    store.save(buildRecord());

    expect(store.getByArtifactId("missing-artifact")).toBeNull();
    expect(store.getByPacketId("missing-packet")).toBeNull();
    expect(store.getBySessionId("missing-session")).toBeNull();
  });

  it("overwrites artifactId index on last write while sessionId stays unique", () => {
    const store = new InMemoryProofReviewStore();
    const first = buildRecord({
      sessionId: "sess-first",
      artifactId: "PP-shared"
    });
    const second = buildRecord({
      sessionId: "sess-second",
      artifactId: "PP-shared"
    });

    store.save(first);
    store.save(second);

    expect(store.getByArtifactId("PP-shared")).toBe(second);
    expect(store.getBySessionId("sess-first")).toBe(first);
    expect(store.getBySessionId("sess-second")).toBe(second);
  });

  it("clears all records and indexes", () => {
    const store = new InMemoryProofReviewStore();
    const record = buildRecord({
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });

    store.save(record);
    store.clear();

    expect(store.getBySessionId(record.sessionId)).toBeNull();
    expect(store.getByArtifactId("PP-000001")).toBeNull();
    expect(store.getByPacketId("pkt-test-001")).toBeNull();
  });
});
