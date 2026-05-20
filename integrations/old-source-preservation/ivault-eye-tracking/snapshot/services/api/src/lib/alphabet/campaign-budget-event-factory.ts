import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type { CampaignBudgetOperationResult } from "../../types/alphabet/campaign-budget.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createAlphabetEventFromCampaignBudgetOperation(params: {
  userId: string;
  result: CampaignBudgetOperationResult;
}): AlphabetEvent | null {
  const { userId, result } = params;

  if (!result.success || !result.ledgerEntry) return null;

  return {
    eventId: createId("alphabet_event"),
    userId,
    coinCode: result.ledgerEntry.rewardCoin,
    eventType:
      result.ledgerEntry.direction === "reserve"
        ? "coin_lot_created"
        : result.ledgerEntry.direction === "commit"
          ? "work_reward_pending"
          : result.ledgerEntry.direction === "spend"
            ? "coin_lot_released"
            : "coin_lot_locked",
    objectType: "campaign_budget",
    objectId: result.ledgerEntry.campaignBudgetId,
    sourceContext: "campaign",
    rawScore: null,
    qualityScore: null,
    trustScoreAtEvent: null,
    riskScore: null,
    ageBand: null,
    verificationStatus: "verified",
    metadata: {
      campaignId: result.ledgerEntry.campaignId,
      direction: result.ledgerEntry.direction,
      reservationId: result.ledgerEntry.reservationId,
      amount: result.ledgerEntry.amount
    },
    createdAt: new Date().toISOString()
  };
}
