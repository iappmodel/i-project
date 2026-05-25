import { describe, expect, it } from "vitest";
import { PopsDecisionService } from "../decisions/pops-decision.service.js";
import {
  POPS_RECOMMENDED_ACTION,
  POPS_REWARD_ELIGIBILITY,
  POPS_TRUST_IMPACT,
  type PopsDecisionInput
} from "../types/pops-decisions.types.js";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../types/pops.types.js";

describe("PopsDecisionService", () => {
  const decisionService = new PopsDecisionService();

  function baseInput(overrides: Partial<PopsDecisionInput> = {}): PopsDecisionInput {
    return {
      sessionId: "sess_1",
      userId: "user_1",
      proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
      state: POPS_SESSION_STATE.FOCUSED,
      presenceConfidence: 0.75,
      attentionConfidence: 0.7,
      intentConfidence: 0.5,
      continuityConfidence: 0.8,
      fraudRisk: 0.1,
      reasonCodes: [],
      ...overrides
    };
  }

  it("approves full eligibility when all thresholds are met", () => {
    const decision = decisionService.evaluate(baseInput());

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);
    expect(decision.recommendedAction).toBe(POPS_RECOMMENDED_ACTION.APPROVE_REWARD);
    expect(decision.trustImpact).toBe(POPS_TRUST_IMPACT.POSITIVE_MEDIUM);
    expect(decision.reasonCodes).toContain("all_thresholds_met");
  });

  it("denies reward when fraud risk is critical", () => {
    const decision = decisionService.evaluate(
      baseInput({ fraudRisk: 0.9, reasonCodes: ["fraud_risk_critical"] })
    );

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.DENIED);
    expect(decision.recommendedAction).toBe(POPS_RECOMMENDED_ACTION.DENY_REWARD);
    expect(decision.trustImpact).toBe(POPS_TRUST_IMPACT.NEGATIVE_HIGH);
    expect(decision.reasonCodes).toContain("fraud_threshold_critical");
  });

  it("holds reward when fraud exceeds threshold but is below critical", () => {
    const decision = decisionService.evaluate(baseInput({ fraudRisk: 0.55 }));

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW);
    expect(decision.recommendedAction).toBe(POPS_RECOMMENDED_ACTION.HOLD_REWARD);
    expect(decision.reasonCodes).toContain("fraud_threshold_exceeded");
  });

  it("returns partial eligibility when presence ok and attention or intent ok", () => {
    const decision = decisionService.evaluate(
      baseInput({
        attentionConfidence: 0.45,
        intentConfidence: 0.35
      })
    );

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL);
    expect(decision.recommendedAction).toBe(POPS_RECOMMENDED_ACTION.PARTIAL_REWARD);
    expect(decision.reasonCodes).toContain("partial_thresholds_met");
  });

  it("requires reverification when presence is too low", () => {
    const decision = decisionService.evaluate(
      baseInput({
        presenceConfidence: 0.4,
        attentionConfidence: 0.2,
        intentConfidence: 0.1
      })
    );

    expect(decision.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE);
    expect(decision.recommendedAction).toBe(POPS_RECOMMENDED_ACTION.REQUIRE_REVERIFICATION);
    expect(decision.reasonCodes).toContain("presence_too_low");
  });

  it("degrades confidence when session state is degraded", () => {
    const decision = decisionService.evaluate(
      baseInput({
        state: POPS_SESSION_STATE.DEGRADED,
        attentionConfidence: 0.45,
        intentConfidence: 0.35
      })
    );

    expect(decision.recommendedAction).toBe(POPS_RECOMMENDED_ACTION.DEGRADE_CONFIDENCE);
    expect(decision.reasonCodes).toContain("sensor_quality_degraded");
  });

  it("stamps version fields on toJudgment", () => {
    const input = baseInput();
    const decision = decisionService.evaluate(input);
    const judgment = decisionService.toJudgment(input, decision);

    expect(judgment.scoringModelVersion).toBeTruthy();
    expect(judgment.ruleVersion).toBeTruthy();
    expect(judgment.fraudModelVersion).toBeTruthy();
    expect(judgment.modelVersion).toBe(judgment.scoringModelVersion);
  });
});
