import type { PopsRewardDecision } from "../types/pops-decisions.types";
import type { PopsSession } from "../types/pops.types";
import type { PopsWalletRewardIntent } from "../types/pops-decisions.types";
import { createPopsId } from "../utils/pops-id";
import { addMinutesIso, nowIso } from "../utils/pops-time";

export function createMockPopsWalletIntent(input: {
  session: PopsSession;
  rewardDecision: PopsRewardDecision;
}): PopsWalletRewardIntent | null {
  const { session, rewardDecision } = input;
  const createdAt = nowIso();
  const releaseAt = addMinutesIso(createdAt, 30);

  if (rewardDecision.decisionStatus === "DENIED_FRAUD_RISK" || rewardDecision.decisionStatus === "DENIED_LOW_CONFIDENCE") {
    return null;
  }

  if (rewardDecision.decisionStatus === "APPROVED_FULL" || rewardDecision.decisionStatus === "APPROVED_PARTIAL") {
    return {
      id: createPopsId("pops_wallet"),
      rewardDecisionId: rewardDecision.id,
      sessionId: session.id,
      userId: session.userId,
      campaignId: session.campaignId,
      coinType: rewardDecision.coinType,
      amount: rewardDecision.finalAmount,
      status: "PENDING",
      releaseEligibleAt: releaseAt,
      createdAt,
    };
  }

  if (rewardDecision.decisionStatus === "HELD") {
    return {
      id: createPopsId("pops_wallet"),
      rewardDecisionId: rewardDecision.id,
      sessionId: session.id,
      userId: session.userId,
      campaignId: session.campaignId,
      coinType: rewardDecision.coinType,
      amount: rewardDecision.finalAmount,
      status: "HELD",
      holdReason: rewardDecision.holdReason,
      createdAt,
    };
  }

  return null;
}
