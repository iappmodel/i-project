import { describe, expect, it } from "vitest";
import { evaluateWalletInvariant } from "../wallet-invariant-engine";
import {
  createTrustEventFromWalletInvariantResult,
  createUValueEventFromWalletInvariantResult
} from "../wallet-invariant-event-factory";
import type { WalletInvariantSignalInput } from "@/types/alphabet/wallet-invariant.types";

function cleanInput(): WalletInvariantSignalInput {
  return {
    invariantType: "wallet_account_balance_mismatch",
    scanScope: "single_wallet_account",
    linkedObjectIds: {
      userId: "11111111-1111-1111-1111-111111111111",
      walletId: "22222222-2222-2222-2222-222222222222",
      walletAccountId: "33333333-3333-3333-3333-333333333333"
    },
    balances: {
      computedAvailableBalance: 1,
      storedAvailableBalance: 1,
      availableDelta: 0,
      computedPendingBalance: 0,
      storedPendingBalance: 0,
      pendingDelta: 0,
      computedReservedBalance: 0,
      storedReservedBalance: 0,
      reservedDelta: 0,
      computedTotalBalance: 1,
      storedTotalBalance: 1,
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
    evidence: { sample: true },
    redactedEvidence: {},
    sourceEventIds: [],
    mismatchDetected: false,
    negativeBalanceDetected: false,
    moneyMovementAffected: false,
    externalProviderAffected: false,
    userVisibleAffected: false,
    allowNegative: false,
    now: new Date().toISOString(),
    metadata: {}
  };
}

describe("wallet-invariant-event-factory", () => {
  it("emits trust clean on pass", () => {
    const evaluation = evaluateWalletInvariant(cleanInput());
    const trust = createTrustEventFromWalletInvariantResult(evaluation);
    expect(trust?.eventType).toBe("wallet_invariant_clean");
    expect(trust?.userId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("emits u-value passed on pass", () => {
    const evaluation = evaluateWalletInvariant(cleanInput());
    const u = createUValueEventFromWalletInvariantResult(evaluation);
    expect(u?.eventType).toBe("wallet_invariant_passed");
    expect(u?.coinCode).toBe("J");
  });

  it("emits trust failed on critical", () => {
    const evaluation = evaluateWalletInvariant({
      ...cleanInput(),
      invariantType: "wallet_negative_available_balance",
      balances: {
        ...cleanInput().balances,
        storedAvailableBalance: -1,
        availableDelta: -1,
        storedTotalBalance: -1,
        totalDelta: -1,
        computedTotalBalance: 0
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
    });
    const trust = createTrustEventFromWalletInvariantResult(evaluation);
    expect(trust?.eventType).toBe("wallet_invariant_failed");
    expect(trust?.severity).toBe("negative_medium");
  });
});
