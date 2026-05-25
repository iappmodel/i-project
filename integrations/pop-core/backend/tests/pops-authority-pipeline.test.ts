import { describe, expect, it } from "vitest";
import { PopsDecisionService } from "../decisions/pops-decision.service.js";
import { POPS_REWARD_ELIGIBILITY } from "../types/pops-decisions.types.js";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../types/pops.types.js";
import { PopsScoringService } from "../scoring/pops-scoring.service.js";
import { POPS_RULE_BUNDLE_V1 } from "../decisions/versioning/pops-rule-registry.js";
import { POPS_SCORING_ENGINE_V1 } from "../decisions/versioning/pops-model-registry.js";
import { partialThresholdBatch, strongEngagedBatch } from "./fixtures/signal-batches.js";

describe("Pops authority pipeline", () => {
  const scoringService = new PopsScoringService();
  const decisionService = new PopsDecisionService();

  it("runs batch → score → evaluate → toJudgment for a strong batch", () => {
    const batch = strongEngagedBatch;
    const scoring = scoringService.score(batch);

    const input = {
      ...scoring,
      sessionId: batch.sessionId,
      userId: batch.userId,
      proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
      state: POPS_SESSION_STATE.FOCUSED
    };

    const decision = decisionService.evaluate(input);
    const judgment = decisionService.toJudgment(input, decision);

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);
    expect(judgment.scoringModelVersion).toBe(POPS_SCORING_ENGINE_V1);
    expect(judgment.ruleVersion).toBe(POPS_RULE_BUNDLE_V1);
    expect(judgment.presenceConfidence).toBe(scoring.presenceConfidence);
    expect(judgment.fraudRisk).toBe(scoring.fraudRisk);
  });

  it("runs batch → score → evaluate for a partial-threshold batch", () => {
    const batch = partialThresholdBatch;
    const scoring = scoringService.score(batch);

    const decision = decisionService.evaluate({
      ...scoring,
      sessionId: batch.sessionId,
      userId: batch.userId,
      proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
      state: POPS_SESSION_STATE.ENGAGED_PASSIVE
    });

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL);
  });
});
