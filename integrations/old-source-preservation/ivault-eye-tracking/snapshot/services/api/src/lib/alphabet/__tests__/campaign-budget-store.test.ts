import { beforeEach, describe, expect, it } from "vitest";
import {
  commitReservation,
  createCampaignBudget,
  getCampaignBudgetByCampaignId,
  getCampaignBudgetLedgerEntries,
  refundCampaignBudget,
  releaseReservation,
  reserveRewardFromCampaignBudget,
  resetCampaignBudgetStoreForTests,
  spendReservation
} from "../campaign-budget-store";

describe("campaign-budget-store", () => {
  beforeEach(() => {
    resetCampaignBudgetStoreForTests();
  });

  it("creates and retrieves campaign budget", () => {
    const campaignId = crypto.randomUUID();

    const result = createCampaignBudget({
      campaignId,
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    expect(result.success).toBe(true);

    const stored = getCampaignBudgetByCampaignId(campaignId);

    expect(stored?.campaignId).toBe(campaignId);
    expect(stored?.availableBudget).toBe(100);
  });

  it("prevents duplicate campaign budget pools", () => {
    const campaignId = crypto.randomUUID();

    createCampaignBudget({
      campaignId,
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    const second = createCampaignBudget({
      campaignId,
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    expect(second.success).toBe(false);
  });

  it("reserves, commits, and spends reward", () => {
    const campaignId = crypto.randomUUID();

    createCampaignBudget({
      campaignId,
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    const reserved = reserveRewardFromCampaignBudget({
      campaignId,
      userId: crypto.randomUUID(),
      sourceEventId: crypto.randomUUID(),
      amount: 20
    });

    expect(reserved.success).toBe(true);
    expect(reserved.reservation?.status).toBe("reserved");

    if (!reserved.reservation) {
      throw new Error("Expected reservation to exist.");
    }

    const committed = commitReservation(reserved.reservation.reservationId);

    expect(committed.success).toBe(true);
    expect(committed.reservation?.status).toBe("committed");

    if (!committed.reservation) {
      throw new Error("Expected committed reservation to exist.");
    }

    const spent = spendReservation(committed.reservation.reservationId);

    expect(spent.success).toBe(true);
    expect(spent.reservation?.status).toBe("spent");

    const pool = getCampaignBudgetByCampaignId(campaignId);

    expect(pool?.spentBudget).toBe(20);
  });

  it("releases reservation", () => {
    const campaignId = crypto.randomUUID();

    createCampaignBudget({
      campaignId,
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    const reserved = reserveRewardFromCampaignBudget({
      campaignId,
      userId: crypto.randomUUID(),
      sourceEventId: crypto.randomUUID(),
      amount: 20
    });

    if (!reserved.reservation) {
      throw new Error("Expected reservation to exist.");
    }

    const released = releaseReservation(reserved.reservation.reservationId, "reward_failed");

    expect(released.success).toBe(true);

    const pool = getCampaignBudgetByCampaignId(campaignId);

    expect(pool?.availableBudget).toBe(100);
    expect(pool?.reservedBudget).toBe(0);
  });

  it("refunds unspent budget", () => {
    const campaignId = crypto.randomUUID();

    createCampaignBudget({
      campaignId,
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    const refunded = refundCampaignBudget({
      campaignId,
      amount: 50,
      reason: "manual_refund"
    });

    expect(refunded.success).toBe(true);

    const pool = getCampaignBudgetByCampaignId(campaignId);

    expect(pool?.availableBudget).toBe(50);
    expect(pool?.refundedBudget).toBe(50);
  });

  it("stores budget ledger entries", () => {
    const campaignId = crypto.randomUUID();

    const created = createCampaignBudget({
      campaignId,
      ownerId: crypto.randomUUID(),
      rewardCoin: "I",
      totalBudget: 100
    });

    if (!created.campaignBudget) {
      throw new Error("Expected campaign budget to be created.");
    }

    const entries = getCampaignBudgetLedgerEntries(created.campaignBudget.campaignBudgetId);

    expect(entries.length).toBe(1);
    expect(entries[0].direction).toBe("fund");
  });
});
