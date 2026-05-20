import { describe, expect, it } from "vitest";
import { evaluateWalletInvariant } from "../wallet-invariant-engine";
import type { WalletInvariantSignalInput } from "@/types/alphabet/wallet-invariant.types";

function makeInput(overrides: Partial<WalletInvariantSignalInput> = {}): WalletInvariantSignalInput {
  return {
    invariantType: "wallet_account_balance_mismatch",
    scanScope: "single_wallet_account",
    linkedObjectIds: {
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      walletAccountId: crypto.randomUUID()
    },
    balances: {
      computedAvailableBalance: 100,
      storedAvailableBalance: 100,
      availableDelta: 0,
      computedPendingBalance: 0,
      storedPendingBalance: 0,
      pendingDelta: 0,
      computedReservedBalance: 0,
      storedReservedBalance: 0,
      reservedDelta: 0,
      computedTotalBalance: 100,
      storedTotalBalance: 100,
      totalDelta: 0
    },
    riskScores: {
      financialImpactScore: 0.1,
      userImpactScore: 0.1,
      exploitabilityScore: 0.1,
      recurrenceRiskScore: 0.1,
      confidenceScore: 0.95,
      repairComplexityScore: 0.1
    },
    evidence: { ok: true },
    redactedEvidence: {},
    sourceEventIds: [],
    mismatchDetected: false,
    negativeBalanceDetected: false,
    moneyMovementAffected: false,
    externalProviderAffected: false,
    userVisibleAffected: false,
    allowNegative: false,
    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("wallet-invariant-engine", () => {
  it("passes clean wallet account balance", () => {
    const result = evaluateWalletInvariant(makeInput());

    expect(result.status).toBe("invariant_pass");
    expect(result.passed).toBe(true);
  });

  it("fails balance delta above epsilon", () => {
    const result = evaluateWalletInvariant(
      makeInput({
        balances: {
          computedAvailableBalance: 100,
          storedAvailableBalance: 90,
          availableDelta: -10,
          computedPendingBalance: 0,
          storedPendingBalance: 0,
          pendingDelta: 0,
          computedReservedBalance: 0,
          storedReservedBalance: 0,
          reservedDelta: 0,
          computedTotalBalance: 100,
          storedTotalBalance: 90,
          totalDelta: -10
        },
        mismatchDetected: true,
        moneyMovementAffected: true,
        riskScores: {
          financialImpactScore: 0.8,
          userImpactScore: 0.7,
          exploitabilityScore: 0.3,
          recurrenceRiskScore: 0.4,
          confidenceScore: 0.95,
          repairComplexityScore: 0.6
        }
      })
    );

    expect(result.failed || result.critical).toBe(true);
    expect(result.shouldCreateOperationalAlert).toBe(true);
  });

  it("marks negative balance as critical", () => {
    const result = evaluateWalletInvariant(
      makeInput({
        invariantType: "wallet_negative_available_balance",
        balances: {
          computedAvailableBalance: 0,
          storedAvailableBalance: -5,
          availableDelta: -5,
          computedPendingBalance: 0,
          storedPendingBalance: 0,
          pendingDelta: 0,
          computedReservedBalance: 0,
          storedReservedBalance: 0,
          reservedDelta: 0,
          computedTotalBalance: 0,
          storedTotalBalance: -5,
          totalDelta: -5
        },
        mismatchDetected: true,
        negativeBalanceDetected: true,
        moneyMovementAffected: true,
        riskScores: {
          financialImpactScore: 0.95,
          userImpactScore: 0.9,
          exploitabilityScore: 0.5,
          recurrenceRiskScore: 0.5,
          confidenceScore: 0.98,
          repairComplexityScore: 0.8
        }
      })
    );

    expect(result.status).toBe("invariant_critical");
    expect(result.shouldCreateReviewCase).toBe(true);
  });

  it("skips low confidence invariant", () => {
    const result = evaluateWalletInvariant(
      makeInput({
        riskScores: {
          financialImpactScore: 0.8,
          userImpactScore: 0.8,
          exploitabilityScore: 0.3,
          recurrenceRiskScore: 0.3,
          confidenceScore: 0.1,
          repairComplexityScore: 0.5
        }
      })
    );

    expect(result.status).toBe("invariant_skip");
  });
});
