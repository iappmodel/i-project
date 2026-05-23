import { describe, expect, it } from "vitest";
import { ProofReviewService } from "../../review/proof-review-service.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import { POPS_REWARD_ELIGIBILITY } from "../../types/pops-decisions.types.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";

describe("ProofReviewService", () => {
  const submittedAt = "2026-05-23T12:00:00.000Z";

  function createService(): ProofReviewService {
    return new ProofReviewService(new InMemoryProofReviewStore());
  }

  it("submits PP-000001 and stores pending original with approved projection", () => {
    const service = createService();
    const inputPacket = pp000001Packet;

    expect(inputPacket.review.status).toBe("pending");

    const record = service.submitProofPacketForReview(inputPacket, {
      artifactId: "PP-000001",
      packetId: "pkt-test-001",
      submittedAt
    });

    expect(record.status).toBe("approved");
    expect(record.review.status).toBe("approved");
    expect(record.review.reasons).toContain("all_thresholds_met");
    expect(record.decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);

    expect(record.originalPacket.review.status).toBe("pending");
    expect(record.projectedPacket.review.status).toBe("approved");
    expect(record.projectedPacket.review).toEqual(record.review);

    expect(inputPacket.review.status).toBe("pending");
  });

  it("stores identity fields and full projection artifacts for PP-000001", () => {
    const service = createService();

    const record = service.submitProofPacketForReview(pp000001Packet, { submittedAt });

    expect(record.sessionId).toBe(pp000001Packet.sessionId);
    expect(record.userId).toBeNull();
    expect(record.localUserRef).toBe(pp000001Packet.localUserRef);
    expect(record.contentId).toBe(pp000001Packet.contentId);
    expect(record.offerId).toBe(pp000001Packet.offerId);
    expect(record.submittedAt).toBe(submittedAt);
    expect(record.reviewedAt).toBe(record.decision.createdAt);

    expect(record.batch.sessionId).toBe(pp000001Packet.sessionId);
    expect(record.scoring.presenceConfidence).toBeGreaterThanOrEqual(0);
    expect(record.scoring.presenceConfidence).toBeLessThanOrEqual(1);
    expect(record).toHaveProperty("decision");
    expect(record).toHaveProperty("review");
  });

  it("does not populate settlement or layer outcomes beyond null settlementAmount", () => {
    const service = createService();

    const record = service.submitProofPacketForReview(pp000001Packet);

    expect(record.review.settlementAmount).toBeNull();
    expect(record.review.layerOutcomes).toBeNull();
    expect(record.projectedPacket.review.settlementAmount).toBeNull();
    expect(record.projectedPacket.review.layerOutcomes).toBeNull();
  });

  it("looks up records by sessionId, artifactId, and packetId", () => {
    const service = createService();

    const record = service.submitProofPacketForReview(pp000001Packet, {
      artifactId: "PP-000001",
      packetId: "pkt-test-001",
      submittedAt
    });

    expect(service.getReviewBySessionId(pp000001Packet.sessionId)).toBe(record);
    expect(service.getReviewByArtifactId("PP-000001")).toBe(record);
    expect(service.getReviewByPacketId("pkt-test-001")).toBe(record);
  });

  it("returns null for missing lookups", () => {
    const service = createService();

    expect(service.getReviewBySessionId("missing-session")).toBeNull();
    expect(service.getReviewByArtifactId("missing-artifact")).toBeNull();
    expect(service.getReviewByPacketId("missing-packet")).toBeNull();
  });
});
