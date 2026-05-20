import { describe, expect, it } from "vitest";
import { verifyConversionQuote } from "../conversion-engine";
import type { ConversionSignalInput } from "../../../types/alphabet/conversion.types";

function makeInput(
  overrides: Partial<ConversionSignalInput> = {}
): ConversionSignalInput {
  return {
    conversionQuoteId: crypto.randomUUID(),
    walletId: crypto.randomUUID(),
    userId: crypto.randomUUID(),

    sourceCoin: "W",
    targetCoin: "I",

    sourceAmount: 100,
    sourceState: "available",
    availableSourceBalance: 200,

    conversionRate: 0.25,
    conversionFeeRate: 0.02,

    trustScore: 80,
    uValueScore: 40,

    walletRiskScore: 0.03,
    fraudRisk: 0.02,
    chargebackRisk: 0.02,
    sourceCoinAbuseRisk: 0.02,
    conversionVelocityRisk: 0.02,
    liquidityManipulationRisk: 0.01,

    recentPenaltyCount: 0,
    recentSeverePenaltyCount: 0,

    withdrawalLocked: false,
    walletLocked: false,

    liquidityAvailableAmount: 1000,
    liquidityReserveRatio: 0.9,

    ageBand: "18_plus",

    metadata: {},
    ...overrides
  };
}

describe("conversion-engine", () => {
  it("approves clean conversion", () => {
    const result = verifyConversionQuote(makeInput());

    expect(result.status).toBe("conversion_approved");
    expect(result.targetAmount).toBe(24.5);
    expect(result.conversionFeeAmount).toBe(0.5);
    expect(result.liquidityReservedEvent?.eventType).toBe("liquidity_reserved");
    expect(result.conversionCompletedEvent?.eventType).toBe("conversion_completed");
    expect(result.vCoinEvent?.eventType).toBe("vcoin_adjusted");
  });

  it("rejects non-convertible score coin", () => {
    const result = verifyConversionQuote(
      makeInput({
        sourceCoin: "F",
        sourceState: "score",
        sourceAmount: 10,
        availableSourceBalance: 10,
        conversionRate: 0
      })
    );

    expect(result.status).toBe("conversion_rejected");
    expect(result.reasons).toContain("source_coin_not_convertible");
  });

  it("keeps pending source state pending", () => {
    const result = verifyConversionQuote(
      makeInput({
        sourceState: "pending"
      })
    );

    expect(result.status).toBe("conversion_pending");
    expect(result.reasons).toContain("source_state_not_convertible");
  });

  it("rejects insufficient balance", () => {
    const result = verifyConversionQuote(
      makeInput({
        availableSourceBalance: 50
      })
    );

    expect(result.status).toBe("conversion_rejected");
    expect(result.reasons).toContain("insufficient_available_source_balance");
  });

  it("returns liquidity unavailable when liquidity is weak", () => {
    const result = verifyConversionQuote(
      makeInput({
        liquidityAvailableAmount: 1,
        liquidityReserveRatio: 0.1
      })
    );

    expect(result.status).toBe("liquidity_unavailable");
    expect(result.reasons).toContain("liquidity_score_below_minimum");
  });

  it("blocks wallet locked", () => {
    const result = verifyConversionQuote(
      makeInput({
        walletLocked: true
      })
    );

    expect(result.status).toBe("wallet_locked");
    expect(result.reasons).toContain("wallet_locked");
  });

  it("keeps conversion pending when withdrawal locked", () => {
    const result = verifyConversionQuote(
      makeInput({
        withdrawalLocked: true
      })
    );

    expect(result.status).toBe("conversion_pending");
    expect(result.reasons).toContain("withdrawal_locked_conversion_allowed_but_pending");
  });

  it("flags fraud as suspicious", () => {
    const result = verifyConversionQuote(
      makeInput({
        fraudRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.conversionFraudEvent?.eventType).toBe("conversion_fraud_detected");
  });

  it("blocks severe penalties", () => {
    const result = verifyConversionQuote(
      makeInput({
        recentSeverePenaltyCount: 1
      })
    );

    expect(result.status).toBe("conversion_rejected");
    expect(result.reasons).toContain("recent_severe_penalty_blocks_conversion");
  });

  it("requires guardian approval for teen conversion", () => {
    const result = verifyConversionQuote(
      makeInput({
        ageBand: "13_15",
        metadata: {
          guardianApproved: false
        }
      })
    );

    expect(result.status).toBe("conversion_pending");
    expect(result.reasons).toContain("minor_conversion_requires_guardian_approval");
  });

  it("allows teen with guardian approval", () => {
    const result = verifyConversionQuote(
      makeInput({
        ageBand: "13_15",
        metadata: {
          guardianApproved: true
        }
      })
    );

    expect(result.status).toBe("conversion_approved");
  });
});
