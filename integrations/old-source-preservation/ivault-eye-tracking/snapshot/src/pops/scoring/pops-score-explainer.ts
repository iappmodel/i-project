import type { PopsRewardEligibility } from "../types/pops-decisions.types";
import type { PopsReasonCode } from "../constants/pops-reason-codes";

export interface PopsJudgmentLike {
  rewardEligibility: PopsRewardEligibility;
}

export function getPopsUserSafeSummary(judgmentLike: PopsJudgmentLike): string {
  switch (judgmentLike.rewardEligibility) {
    case "ELIGIBLE_FULL":
      return "Moment verified.";
    case "ELIGIBLE_PARTIAL":
      return "Partial moment verified.";
    case "HELD_FOR_REVIEW":
      return "Reward under review.";
    case "DENIED":
    case "NOT_ELIGIBLE":
    default:
      return "Moment not verified.";
  }
}

export interface PopsJudgmentInternalLike extends PopsJudgmentLike {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  reasonCodes: readonly PopsReasonCode[];
}

export function getPopsInternalSummary(judgment: PopsJudgmentInternalLike): string {
  const codes = judgment.reasonCodes.join(", ");
  return (
    `presence=${judgment.presenceConfidence.toFixed(3)} attention=${judgment.attentionConfidence.toFixed(3)} ` +
    `intent=${judgment.intentConfidence.toFixed(3)} continuity=${judgment.continuityConfidence.toFixed(3)} ` +
    `fraud=${judgment.fraudRisk.toFixed(3)} eligibility=${judgment.rewardEligibility} reasons=[${codes}]`
  );
}
