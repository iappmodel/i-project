import { describe, expect, it } from "vitest";
import { eligibilityToLifecycleEventType } from "../../adapters/proof-review-status-map.js";
import { lifecycleEventFromDecision } from "../../review/proof-review-lifecycle.js";
import { PROOF_REVIEW_LIFECYCLE_EVENT } from "../../review/proof-review-lifecycle.types.js";
import {
  POPS_REWARD_ELIGIBILITY,
  type PopsRewardDecision
} from "../../types/pops-decisions.types.js";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../../types/pops.types.js";

function buildDecision(
  rewardEligibility: PopsRewardDecision["rewardEligibility"],
  reasonCodes: string[] = ["test_reason"]
): PopsRewardDecision {
  return {
    id: "pops_reward_decision_test",
    sessionId: "sess_test",
    userId: "user_test",
    proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
    sessionState: POPS_SESSION_STATE.COMPLETED,
    rewardEligibility,
    trustImpact: "NONE",
    recommendedAction: "APPROVE_REWARD",
    reasonCodes,
    createdAt: "2026-05-20T18:08:42.000Z"
  };
}

describe("eligibilityToLifecycleEventType", () => {
  it.each([
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL, PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED],
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL, PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED],
    [POPS_REWARD_ELIGIBILITY.DENIED, PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED],
    [POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE, PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED],
    [POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW, PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED],
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING, PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED]
  ] as const)("maps %s to %s", (eligibility, eventType) => {
    expect(eligibilityToLifecycleEventType(eligibility)).toBe(eventType);
  });
});

describe("lifecycleEventFromDecision", () => {
  it("builds AUTHORITY_REVIEW_COMPLETED for ELIGIBLE_FULL", () => {
    const decision = buildDecision(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL, ["all_thresholds_met"]);

    expect(lifecycleEventFromDecision(decision)).toEqual({
      type: PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED,
      sessionId: "sess_test",
      occurredAt: "2026-05-20T18:08:42.000Z",
      reasonCodes: ["all_thresholds_met"],
      decisionId: "pops_reward_decision_test",
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL,
      targetStatus: "approved"
    });
  });

  it("builds AUTHORITY_REVIEW_DEFERRED for ELIGIBLE_PENDING", () => {
    const decision = buildDecision(POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING, ["confidence_pending"]);

    expect(lifecycleEventFromDecision(decision)).toEqual({
      type: PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED,
      sessionId: "sess_test",
      occurredAt: "2026-05-20T18:08:42.000Z",
      reasonCodes: ["confidence_pending"],
      decisionId: "pops_reward_decision_test",
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING
    });
  });

  it("maps HELD_FOR_REVIEW to escalated target status", () => {
    const decision = buildDecision(POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW, ["fraud_threshold_exceeded"]);
    const event = lifecycleEventFromDecision(decision);

    expect(event.type).toBe(PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED);
    if (event.type === PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED) {
      expect(event.targetStatus).toBe("escalated");
    }
  });
});
