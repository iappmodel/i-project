import { beforeEach, describe, expect, it } from "vitest";
import {
  createTreasuryReserveAccount,
  evaluateStoredTreasuryAction,
  getTreasuryEvaluationResult,
  getTreasuryReserveAccount,
  listTreasuryReserveAccounts,
  resetTreasuryStoreForTests
} from "../treasury-store";

describe("treasury-store", () => {
  beforeEach(() => {
    resetTreasuryStoreForTests();
  });

  it("creates treasury reserve account", () => {
    const account = createTreasuryReserveAccount({
      reserveType: "campaign_budget",
      coinCode: "I",
      currencyCode: "USD",
      totalReserveBalance: 10000,
      allocatedBalance: 1000,
      pendingObligationBalance: 1000
    });

    expect(account.availableBalance).toBe(8000);

    const stored = getTreasuryReserveAccount(account.treasuryAccountId);
    expect(stored?.treasuryAccountId).toBe(account.treasuryAccountId);
  });

  it("lists treasury accounts by reserve type", () => {
    createTreasuryReserveAccount({
      reserveType: "campaign_budget",
      coinCode: "I",
      currencyCode: "USD",
      totalReserveBalance: 10000
    });

    createTreasuryReserveAccount({
      reserveType: "liquidity_pool",
      coinCode: "I",
      currencyCode: "USD",
      totalReserveBalance: 5000
    });

    expect(listTreasuryReserveAccounts("campaign_budget")).toHaveLength(1);
    expect(listTreasuryReserveAccounts()).toHaveLength(2);
  });

  it("evaluates stored treasury action and reserves budget", () => {
    const account = createTreasuryReserveAccount({
      reserveType: "campaign_budget",
      coinCode: "I",
      currencyCode: "USD",
      totalReserveBalance: 10000,
      allocatedBalance: 1000,
      pendingObligationBalance: 1000
    });

    const result = evaluateStoredTreasuryAction({
      treasuryAccountId: account.treasuryAccountId,
      actionType: "approve_campaign_budget",
      requestedAmount: 1000,

      campaignBudgetCommitments: 1000,
      liquidityConversionObligations: 500,
      withdrawalObligations: 500,
      grantObligations: 200,
      creatorPayoutObligations: 300,
      refundChargebackExposure: 100,

      reserveCoverageRatio: 1.4,
      liquidityCoverageRatio: 1.2,

      economyHealthScore: 0.78,
      fraudPressureScore: 0.08,
      rewardLeakageScore: 0.12,
      anomalyScore: 0.08,

      trustScore: 80,
      riskScore: 0.05
    });

    expect(result.budgetApproved).toBe(true);

    const storedResult = getTreasuryEvaluationResult(account.treasuryAccountId);
    expect(storedResult?.treasuryAccountId).toBe(account.treasuryAccountId);

    const updated = getTreasuryReserveAccount(account.treasuryAccountId);
    expect(updated?.allocatedBalance).toBe(2000);
  });

  it("locks account on liquidity lock", () => {
    const account = createTreasuryReserveAccount({
      reserveType: "liquidity_pool",
      coinCode: "I",
      currencyCode: "USD",
      totalReserveBalance: 10000
    });

    const result = evaluateStoredTreasuryAction({
      treasuryAccountId: account.treasuryAccountId,
      actionType: "lock_liquidity",
      requestedAmount: 0,

      campaignBudgetCommitments: 0,
      liquidityConversionObligations: 5000,
      withdrawalObligations: 0,
      grantObligations: 0,
      creatorPayoutObligations: 0,
      refundChargebackExposure: 0,

      reserveCoverageRatio: 1.4,
      liquidityCoverageRatio: 1.2,

      economyHealthScore: 0.78,
      fraudPressureScore: 0.08,
      rewardLeakageScore: 0.12,
      anomalyScore: 0.08,

      trustScore: 80,
      riskScore: 0.05
    });

    expect(result.liquidityLocked).toBe(true);

    const updated = getTreasuryReserveAccount(account.treasuryAccountId);
    expect(updated?.status).toBe("locked");
  });

  it("blocks over-budget request", () => {
    const account = createTreasuryReserveAccount({
      reserveType: "campaign_budget",
      coinCode: "I",
      currencyCode: "USD",
      totalReserveBalance: 10000,
      allocatedBalance: 1000,
      pendingObligationBalance: 1000
    });

    const result = evaluateStoredTreasuryAction({
      treasuryAccountId: account.treasuryAccountId,
      actionType: "approve_campaign_budget",
      requestedAmount: 9000,

      campaignBudgetCommitments: 1000,
      liquidityConversionObligations: 500,
      withdrawalObligations: 500,
      grantObligations: 200,
      creatorPayoutObligations: 300,
      refundChargebackExposure: 100,

      reserveCoverageRatio: 1.4,
      liquidityCoverageRatio: 1.2,

      economyHealthScore: 0.78,
      fraudPressureScore: 0.08,
      rewardLeakageScore: 0.12,
      anomalyScore: 0.08,

      trustScore: 80,
      riskScore: 0.05
    });

    expect(result.budgetRejected).toBe(true);

    const updated = getTreasuryReserveAccount(account.treasuryAccountId);
    expect(updated?.allocatedBalance).toBe(1000);
  });
});
