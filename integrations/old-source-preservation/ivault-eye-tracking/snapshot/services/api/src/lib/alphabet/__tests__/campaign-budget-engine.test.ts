import { describe, expect, it } from "vitest";
import {
  commitCampaignRewardReservation,
  createCampaignBudgetPool,
  refundAvailableCampaignBudget,
  releaseCampaignRewardReservation,
  reserveCampaignReward,
  spendCommittedCampaignReward
} from "../campaign-budget-engine";

function createPool() {
  const result = createCampaignBudgetPool({
    campaignId: crypto.randomUUID(),
    ownerId: crypto.randomUUID(),
    rewardCoin: "I",
    totalBudget: 100
  });

  if (!result.success || !result.campaignBudget) {
    throw new Error("Failed to create test pool.");
  }

  return result.campaignBudget;
}

describe("campaign-budget-engine", () => {
  it("creates funded budget pool", () => {
    const result = createCampaignBudgetPool({
      campaignId: crypto.randomUUID(),
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    expect(result.success).toBe(true);
    expect(result.campaignBudget?.totalBudget).toBe(100);
    expect(result.campaignBudget?.availableBudget).toBe(100);
    expect(result.ledgerEntry?.direction).toBe("fund");
  });

  it("rejects zero budget", () => {
    const result = createCampaignBudgetPool({
      campaignId: crypto.randomUUID(),
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 0
    });

    expect(result.success).toBe(false);
  });

  it("reserves campaign reward budget", () => {
    const pool = createPool();

    const result = reserveCampaignReward({
      campaignBudget: pool,
      userId: crypto.randomUUID(),
      sourceEventId: crypto.randomUUID(),
      amount: 25
    });

    expect(result.success).toBe(true);
    expect(result.campaignBudget?.availableBudget).toBe(75);
    expect(result.campaignBudget?.reservedBudget).toBe(25);
    expect(result.reservation?.status).toBe("reserved");
  });

  it("prevents over-reservation", () => {
    const pool = createPool();

    const result = reserveCampaignReward({
      campaignBudget: pool,
      userId: crypto.randomUUID(),
      sourceEventId: crypto.randomUUID(),
      amount: 150
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain("Insufficient");
  });

  it("commits reserved budget", () => {
    const pool = createPool();

    const reserved = reserveCampaignReward({
      campaignBudget: pool,
      userId: crypto.randomUUID(),
      sourceEventId: crypto.randomUUID(),
      amount: 25
    });

    if (!reserved.campaignBudget || !reserved.reservation) {
      throw new Error("Reservation failed.");
    }

    const committed = commitCampaignRewardReservation({
      campaignBudget: reserved.campaignBudget,
      reservation: reserved.reservation
    });

    expect(committed.success).toBe(true);
    expect(committed.campaignBudget?.reservedBudget).toBe(0);
    expect(committed.campaignBudget?.committedBudget).toBe(25);
    expect(committed.reservation?.status).toBe("committed");
  });

  it("spends committed budget", () => {
    const pool = createPool();

    const reserved = reserveCampaignReward({
      campaignBudget: pool,
      userId: crypto.randomUUID(),
      sourceEventId: crypto.randomUUID(),
      amount: 25
    });

    if (!reserved.campaignBudget || !reserved.reservation) {
      throw new Error("Reservation failed.");
    }

    const committed = commitCampaignRewardReservation({
      campaignBudget: reserved.campaignBudget,
      reservation: reserved.reservation
    });

    if (!committed.campaignBudget || !committed.reservation) {
      throw new Error("Commit failed.");
    }

    const spent = spendCommittedCampaignReward({
      campaignBudget: committed.campaignBudget,
      reservation: committed.reservation
    });

    expect(spent.success).toBe(true);
    expect(spent.campaignBudget?.committedBudget).toBe(0);
    expect(spent.campaignBudget?.spentBudget).toBe(25);
    expect(spent.reservation?.status).toBe("spent");
  });

  it("releases reserved budget back to available", () => {
    const pool = createPool();

    const reserved = reserveCampaignReward({
      campaignBudget: pool,
      userId: crypto.randomUUID(),
      sourceEventId: crypto.randomUUID(),
      amount: 25
    });

    if (!reserved.campaignBudget || !reserved.reservation) {
      throw new Error("Reservation failed.");
    }

    const released = releaseCampaignRewardReservation({
      campaignBudget: reserved.campaignBudget,
      reservation: reserved.reservation,
      reason: "reward_issuance_failed"
    });

    expect(released.success).toBe(true);
    expect(released.campaignBudget?.availableBudget).toBe(100);
    expect(released.campaignBudget?.reservedBudget).toBe(0);
    expect(released.reservation?.status).toBe("released");
  });

  it("refunds available budget", () => {
    const pool = createPool();

    const refunded = refundAvailableCampaignBudget({
      campaignBudget: pool,
      amount: 40,
      reason: "campaign_closed"
    });

    expect(refunded.success).toBe(true);
    expect(refunded.campaignBudget?.availableBudget).toBe(60);
    expect(refunded.campaignBudget?.refundedBudget).toBe(40);
  });
});
