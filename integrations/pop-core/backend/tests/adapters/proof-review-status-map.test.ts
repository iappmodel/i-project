import { describe, expect, it } from "vitest";
import {
  popsDecisionToProofReview,
  popsRewardEligibilityToProofReviewStatus,
  proofReviewStatusToPopsRewardEligibility
} from "../../adapters/proof-review-status-map.js";
import {
  POPS_REWARD_ELIGIBILITY,
  type PopsRewardDecision
} from "../../types/pops-decisions.types.js";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../../types/pops.types.js";

describe("popsRewardEligibilityToProofReviewStatus", () => {
  it.each([
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL, "approved"],
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL, "partial"],
    [POPS_REWARD_ELIGIBILITY.DENIED, "rejected"],
    [POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE, "rejected"],
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING, "pending"],
    [POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW, "escalated"]
  ] as const)("maps %s to %s", (eligibility, status) => {
    expect(popsRewardEligibilityToProofReviewStatus(eligibility)).toBe(status);
  });
});

describe("proofReviewStatusToPopsRewardEligibility", () => {
  it.each([
    POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL,
    POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL,
    POPS_REWARD_ELIGIBILITY.DENIED,
    POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING,
    POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW
  ] as const)("round-trips %s", (eligibility) => {
    const status = popsRewardEligibilityToProofReviewStatus(eligibility);
    expect(proofReviewStatusToPopsRewardEligibility(status)).toBe(eligibility);
  });
});

describe("popsDecisionToProofReview", () => {
  it("projects eligibility-only input as pending review metadata", () => {
    expect(popsDecisionToProofReview(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL)).toEqual({
      status: "approved",
      reviewedAt: null,
      reasons: [],
      layerOutcomes: null,
      settlementAmount: null
    });
  });

  it("projects a full reward decision", () => {
    const decision: PopsRewardDecision = {
      id: "pops_reward_decision_test",
      sessionId: "sess_test",
      userId: "user_test",
      proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
      sessionState: POPS_SESSION_STATE.COMPLETED,
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL,
      trustImpact: "POSITIVE_MEDIUM",
      recommendedAction: "APPROVE_REWARD",
      reasonCodes: ["all_thresholds_met"],
      createdAt: "2026-05-20T18:08:42.000Z"
    };

    expect(popsDecisionToProofReview(decision)).toEqual({
      status: "approved",
      reviewedAt: "2026-05-20T18:08:42.000Z",
      reasons: ["all_thresholds_met"],
      layerOutcomes: null,
      settlementAmount: null
    });
  });
});
