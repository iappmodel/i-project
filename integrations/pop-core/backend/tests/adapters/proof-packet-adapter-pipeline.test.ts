import { describe, expect, it } from "vitest";
import {
  proofPacketV0ToDecisionInput,
  proofPacketV0ToPopsSignalBatch
} from "../../adapters/proof-packet-v0-to-pops.js";
import { popsDecisionToProofReview } from "../../adapters/proof-review-status-map.js";
import { PopsDecisionService } from "../../decisions/pops-decision.service.js";
import { POPS_REWARD_ELIGIBILITY } from "../../types/pops-decisions.types.js";
import { PopsScoringService } from "../../scoring/pops-scoring.service.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";

describe("ProofPacketV0 adapter pipeline", () => {
  it("runs PP-000001 through score, evaluate, and review projection", () => {
    const scoringService = new PopsScoringService();
    const decisionService = new PopsDecisionService();

    const batch = proofPacketV0ToPopsSignalBatch(pp000001Packet);
    const scoring = scoringService.score(batch);
    const input = proofPacketV0ToDecisionInput(pp000001Packet, scoring);
    const decision = decisionService.evaluate(input);
    const review = popsDecisionToProofReview(decision);
    const judgment = decisionService.toJudgment(input, decision);

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);
    expect(review.status).toBe("approved");
    expect(review.reasons).toContain("all_thresholds_met");
    expect(scoring.presenceConfidence).toBeGreaterThanOrEqual(0.65);
    expect(scoring.fraudRisk).toBeLessThanOrEqual(0.4);
    expect(judgment.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);
  });
});
