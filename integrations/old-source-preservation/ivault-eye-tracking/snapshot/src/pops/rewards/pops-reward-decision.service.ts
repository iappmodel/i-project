import type { PopsJudgment } from "../types/pops.types";
import type { PopsSession } from "../types/pops.types";
import type { PopsRewardDecision, PopsRewardDecisionStatus } from "../types/pops-decisions.types";
import type { PopsReasonCode } from "../constants/pops-reason-codes";
import { addReason, hasReason } from "../scoring/pops-score-utils";
import { calculatePopsRewardQuality, getPopsTrustMultiplier } from "./pops-reward-formula";
import { createPopsId } from "../utils/pops-id";
import { nowIso } from "../utils/pops-time";

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function baseDecisionStatus(judgment: PopsJudgment): PopsRewardDecisionStatus {
  if (judgment.fraudRisk >= 0.75) return "DENIED_FRAUD_RISK";
  if (judgment.fraudRisk >= 0.5) return "HELD";
  if (judgment.rewardEligibility === "ELIGIBLE_FULL") return "APPROVED_FULL";
  if (judgment.rewardEligibility === "ELIGIBLE_PARTIAL") return "APPROVED_PARTIAL";
  return "DENIED_LOW_CONFIDENCE";
}

export function createPopsRewardDecision(input: {
  session: PopsSession;
  judgment: PopsJudgment;
  trustTier?: number;
}): PopsRewardDecision {
  const { session, judgment } = input;
  const trustTier = input.trustTier ?? 2;
  const baseAmount = session.expectedReward?.amount ?? 0.25;
  const coinType = session.expectedReward?.coinType ?? "iCoin";
  const rewardQuality = calculatePopsRewardQuality(judgment);
  const trustMultiplier = getPopsTrustMultiplier(trustTier);

  let decisionStatus = baseDecisionStatus(judgment);
  if (
    hasReason(judgment.reasonCodes, "DEVICE_INTEGRITY_WARNING") &&
    (decisionStatus === "APPROVED_FULL" || decisionStatus === "APPROVED_PARTIAL")
  ) {
    decisionStatus = "HELD";
  }

  let finalAmount: number;
  let holdRequired: boolean;
  let holdReason: string | undefined;
  let userVisibleMessage: string;
  let reasonCodes: PopsReasonCode[] = [...judgment.reasonCodes];

  switch (decisionStatus) {
    case "DENIED_FRAUD_RISK":
      finalAmount = 0;
      holdRequired = false;
      userVisibleMessage = "This moment could not be verified.";
      reasonCodes = addReason(reasonCodes, "REWARD_DENIED");
      break;
    case "HELD":
      finalAmount = round6(baseAmount * rewardQuality * trustMultiplier);
      holdRequired = true;
      holdReason = hasReason(judgment.reasonCodes, "DEVICE_INTEGRITY_WARNING")
        ? "DEVICE_INTEGRITY_REVIEW"
        : "REWARD_UNDER_REVIEW";
      userVisibleMessage = "Reward under review.";
      reasonCodes = addReason(reasonCodes, "REWARD_HELD");
      break;
    case "APPROVED_FULL":
      finalAmount = round6(baseAmount * trustMultiplier);
      holdRequired = false;
      userVisibleMessage = "Moment verified. Reward pending.";
      reasonCodes = addReason(reasonCodes, "REWARD_APPROVED_FULL");
      break;
    case "APPROVED_PARTIAL":
      finalAmount = round6(baseAmount * rewardQuality * trustMultiplier);
      holdRequired = false;
      userVisibleMessage = "Partial moment verified. Reduced reward pending.";
      reasonCodes = addReason(reasonCodes, "REWARD_APPROVED_PARTIAL");
      break;
    default:
      finalAmount = 0;
      holdRequired = false;
      userVisibleMessage = "This session did not meet the offer requirements.";
      reasonCodes = addReason(reasonCodes, "REWARD_DENIED");
      break;
  }

  return {
    id: createPopsId("pops_reward"),
    sessionId: session.id,
    judgmentId: judgment.id,
    userId: session.userId,
    campaignId: session.campaignId,
    contentId: session.contentId,
    coinType,
    baseAmount,
    finalAmount,
    decisionStatus,
    rewardQuality,
    presenceConfidence: judgment.presenceConfidence,
    attentionConfidence: judgment.attentionConfidence,
    intentConfidence: judgment.intentConfidence,
    continuityConfidence: judgment.continuityConfidence,
    fraudRisk: judgment.fraudRisk,
    holdRequired,
    holdReason,
    reasonCodes,
    userVisibleMessage,
    createdAt: nowIso(),
  };
}
