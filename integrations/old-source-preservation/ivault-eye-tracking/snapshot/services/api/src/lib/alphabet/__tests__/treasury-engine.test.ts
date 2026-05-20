import { describe, expect, it } from "vitest";
import type { TreasurySignalInput } from "../../../types/alphabet/treasury.types";
import { evaluateTreasuryAction } from "../treasury-engine";

function makeInput(
  overrides: Partial<TreasurySignalInput> = {}
): TreasurySignalInput {
  return {
    treasuryAccountId: crypto.randomUUID(),

    reserveType: "campaign_budget",
    coinCode: "I",
    currencyCode: "USD",

    actionType: "approve_campaign_budget",
    requestedAmount: 1000,

    totalReserveBalance: 10000,
    allocatedBalance: 1000,
    availableBalance: 8000,
    lockedBalance: 0,
    pendingObligationBalance: 1000,

    expectedInflows: 2000,
    expectedOutflows: 1500,

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
    riskScore: 0.05,

    budgetOwnerId: crypto.randomUUID(),
    campaignId: crypto.randomUUID(),
    grantId: null,
    businessId: crypto.randomUUID(),
    creatorId: null,

    metadata: {},
    ...overrides
  };
}

describe("treasury-engine", () => {
  it("approves healthy campaign budget", () => {
    const result = evaluateTreasuryAction(makeInput());

    expect(["healthy", "watch"]).toContain(result.status);
    expect(result.budgetApproved).toBe(true);
    expect(result.budgetApprovedEvent?.eventType).toBe("budget_approved");
    expect(result.reserveAllocatedEvent?.eventType).toBe("reserve_allocated");
  });

  it("rejects when requested amount exceeds available reserve", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        requestedAmount: 9000
      })
    );

    expect(result.status).toBe("budget_blocked");
    expect(result.budgetRejected).toBe(true);
    expect(result.reasons).toContain("requested_amount_exceeds_available_reserve");
  });

  it("blocks action not allowed for reserve type", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        reserveType: "liquidity_pool",
        actionType: "approve_campaign_budget"
      })
    );

    expect(result.status).toBe("budget_blocked");
    expect(result.reasons).toContain("action_not_allowed_for_reserve_type");
  });

  it("detects constrained treasury from weak coverage", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        reserveCoverageRatio: 0.8,
        liquidityCoverageRatio: 0.8
      })
    );

    expect(["constrained", "critical", "watch"]).toContain(result.status);
    expect(result.reviewRecommended).toBe(true);
  });

  it("detects critical treasury from empty reserve", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        totalReserveBalance: 0,
        availableBalance: 0,
        requestedAmount: 0
      })
    );

    expect(result.status).toBe("critical");
    expect(result.reserveLocked).toBe(true);
  });

  it("locks liquidity pool", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        reserveType: "liquidity_pool",
        actionType: "lock_liquidity"
      })
    );

    expect(result.status).toBe("liquidity_blocked");
    expect(result.liquidityLocked).toBe(true);
    expect(result.liquidityPoolLockedEvent?.eventType).toBe("liquidity_pool_locked");
  });

  it("allocates reserve", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        actionType: "allocate_reserve"
      })
    );

    expect(result.reserveAllocated).toBe(true);
    expect(result.reserveAllocatedEvent?.eventType).toBe("reserve_allocated");
  });

  it("releases reserve", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        actionType: "release_reserve"
      })
    );

    expect(result.reserveReleased).toBe(true);
    expect(result.reserveReleasedEvent?.eventType).toBe("reserve_released");
  });

  it("recommends audit above threshold", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        requestedAmount: 15000,
        availableBalance: 20000,
        totalReserveBalance: 30000
      })
    );

    expect(result.auditRecommended).toBe(true);
  });

  it("detects treasury risk from fraud pressure", () => {
    const result = evaluateTreasuryAction(
      makeInput({
        fraudPressureScore: 0.95
      })
    );

    expect(result.treasuryRiskDetectedEvent?.eventType).toBe("treasury_risk_detected");
  });
});
