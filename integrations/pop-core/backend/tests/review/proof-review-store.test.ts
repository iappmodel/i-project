import { describe, expect, it } from "vitest";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import {
  buildProofReviewRecord,
  runProofReviewStoreContract
} from "./proof-review-store.contract.js";

runProofReviewStoreContract("InMemoryProofReviewStore", () => new InMemoryProofReviewStore());

describe("InMemoryProofReviewStore", () => {
  it("clears all records and indexes", () => {
    const store = new InMemoryProofReviewStore();
    const record = buildProofReviewRecord({
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
