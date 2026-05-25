import { describe, expect, it } from "vitest";
import { projectProofPacketReview } from "../../review/proof-review-projector.js";
import { POPS_REWARD_ELIGIBILITY } from "../../types/pops-decisions.types.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";

describe("projectProofPacketReview", () => {
  it("projects PP-000001 from pending to approved without mutating the input packet", () => {
    const inputPacket = pp000001Packet;

    expect(inputPacket.review.status).toBe("pending");
    expect(inputPacket.review.reasons).toEqual([]);

    const result = projectProofPacketReview(inputPacket);

    expect(result.decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);
    expect(result.review.status).toBe("approved");
    expect(result.review.reasons).toContain("all_thresholds_met");
    expect(result.review.reviewedAt).toBe(result.decision.createdAt);

    expect(result.packet.review).toEqual(result.review);
    expect(result.packet.review.status).toBe("approved");

    expect(inputPacket.review.status).toBe("pending");
    expect(inputPacket.review.reasons).toEqual([]);
  });

  it("returns complete intermediate artifacts for PP-000001", () => {
    const result = projectProofPacketReview(pp000001Packet);

    expect(result.batch.sessionId).toBe(pp000001Packet.sessionId);
    expect(result.scoring.presenceConfidence).toBeGreaterThanOrEqual(0);
    expect(result.scoring.presenceConfidence).toBeLessThanOrEqual(1);
    expect(result.scoring.fraudRisk).toBeGreaterThanOrEqual(0);
    expect(result.scoring.fraudRisk).toBeLessThanOrEqual(1);
    expect(result).toHaveProperty("packet");
    expect(result).toHaveProperty("batch");
    expect(result).toHaveProperty("scoring");
    expect(result).toHaveProperty("decision");
    expect(result).toHaveProperty("review");
  });

  it("does not populate settlement or layer outcomes", () => {
    const result = projectProofPacketReview(pp000001Packet);

    expect(result.review.settlementAmount).toBeNull();
    expect(result.review.layerOutcomes).toBeNull();
    expect(result.packet.review.settlementAmount).toBeNull();
    expect(result.packet.review.layerOutcomes).toBeNull();
  });
});
