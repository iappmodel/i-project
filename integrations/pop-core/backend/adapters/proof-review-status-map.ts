import type { ProofReviewResult, ProofReviewStatus } from "../types/proof-packet-v0.types.js";
import {
  POPS_REWARD_ELIGIBILITY,
  type PopsRewardDecision,
  type PopsRewardEligibility
} from "../types/pops-decisions.types.js";

export function popsRewardEligibilityToProofReviewStatus(
  eligibility: PopsRewardEligibility
): ProofReviewStatus {
  switch (eligibility) {
    case POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL:
      return "approved";
    case POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL:
      return "partial";
    case POPS_REWARD_ELIGIBILITY.DENIED:
    case POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE:
      return "rejected";
    case POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING:
      return "pending";
    case POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW:
      return "escalated";
    default: {
      const exhaustive: never = eligibility;
      return exhaustive;
    }
  }
}

export function proofReviewStatusToPopsRewardEligibility(
  status: ProofReviewStatus
): PopsRewardEligibility {
  switch (status) {
    case "approved":
      return POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL;
    case "partial":
      return POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL;
    case "rejected":
      return POPS_REWARD_ELIGIBILITY.DENIED;
    case "pending":
      return POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING;
    case "escalated":
      return POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function isRewardDecision(
  decisionOrEligibility: PopsRewardDecision | PopsRewardEligibility
): decisionOrEligibility is PopsRewardDecision {
  return (
    typeof decisionOrEligibility === "object" &&
    decisionOrEligibility !== null &&
    "rewardEligibility" in decisionOrEligibility
  );
}

export function popsDecisionToProofReview(
  decisionOrEligibility: PopsRewardDecision | PopsRewardEligibility
): ProofReviewResult {
  if (isRewardDecision(decisionOrEligibility)) {
    return {
      status: popsRewardEligibilityToProofReviewStatus(decisionOrEligibility.rewardEligibility),
      reviewedAt: decisionOrEligibility.createdAt,
      reasons: [...decisionOrEligibility.reasonCodes],
      layerOutcomes: null,
      settlementAmount: null
    };
  }

  return {
    status: popsRewardEligibilityToProofReviewStatus(decisionOrEligibility),
    reviewedAt: null,
    reasons: [],
    layerOutcomes: null,
    settlementAmount: null
  };
}
