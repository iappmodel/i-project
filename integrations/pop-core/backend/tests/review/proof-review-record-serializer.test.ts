import { describe, expect, it } from "vitest";
import { PROOF_REVIEW_LIFECYCLE_EVENT } from "../../review/proof-review-lifecycle.types.js";
import {
  fromStoredRecord,
  PROOF_REVIEW_RECORD_STORAGE_VERSION,
  ProofReviewRecordStorageError,
  toStoredRecord
} from "../../review/persistence/proof-review-record-serializer.js";
import { buildProofReviewRecord } from "./proof-review-store.contract.js";

describe("proof-review-record-serializer", () => {
  it("round-trips a PP-000001 projection record with lifecycleEvents", () => {
    const record = buildProofReviewRecord({
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });

    const stored = toStoredRecord(record);
    const restored = fromStoredRecord(stored);

    expect(stored.storageVersion).toBe(PROOF_REVIEW_RECORD_STORAGE_VERSION);
    expect(stored.lifecycleEvents).toEqual(record.lifecycleEvents);
    expect(restored).toEqual(record);
  });

  it("preserves nested audit artifacts across round-trip", () => {
    const record = buildProofReviewRecord();
    const restored = fromStoredRecord(toStoredRecord(record));

    expect(restored.originalPacket.review.status).toBe("pending");
    expect(restored.projectedPacket.review.status).toBe("approved");
    expect(restored.lifecycleEvents[0]?.type).toBe(
      PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED
    );
  });

  it("rejects unknown storageVersion", () => {
    const stored = toStoredRecord(buildProofReviewRecord());

    expect(() =>
      fromStoredRecord({
        ...stored,
        storageVersion: 99
      })
    ).toThrow(ProofReviewRecordStorageError);
    expect(() =>
      fromStoredRecord({
        ...stored,
        storageVersion: 99
      })
    ).toThrow("Unsupported storageVersion: 99");
  });

  it("rejects missing lifecycleEvents", () => {
    const stored = toStoredRecord(buildProofReviewRecord());
    const { lifecycleEvents: _removed, ...withoutLifecycleEvents } = stored;

    expect(() => fromStoredRecord(withoutLifecycleEvents)).toThrow(
      ProofReviewRecordStorageError
    );
  });
});
