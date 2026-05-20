import { beforeEach, describe, expect, it } from "vitest";
import {
  createConversionQuote,
  getConversionQuote,
  getConversionVerificationResult,
  getLiquidityReservesForQuote,
  resetConversionStoreForTests,
  verifyStoredConversionQuote
} from "../conversion-store";

describe("conversion-store", () => {
  beforeEach(() => {
    resetConversionStoreForTests();
  });

  it("creates conversion quote", () => {
    const quote = createConversionQuote({
      walletId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      sourceCoin: "W",
      targetCoin: "I",
      sourceAmount: 100,
      conversionRate: 0.25,
      conversionFeeRate: 0.02,
      sourceState: "available"
    });

    expect(quote.status).toBe("created");
    expect(quote.targetAmount).toBe(24.5);
    expect(quote.conversionFeeAmount).toBe(0.5);

    const stored = getConversionQuote(quote.conversionQuoteId);
    expect(stored?.conversionQuoteId).toBe(quote.conversionQuoteId);
  });

  it("verifies stored conversion quote and creates liquidity reserve", () => {
    const quote = createConversionQuote({
      walletId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      sourceCoin: "W",
      targetCoin: "I",
      sourceAmount: 100,
      conversionRate: 0.25,
      conversionFeeRate: 0.02,
      sourceState: "available"
    });

    const result = verifyStoredConversionQuote({
      conversionQuoteId: quote.conversionQuoteId,

      availableSourceBalance: 200,

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

      ageBand: "18_plus"
    });

    expect(result.status).toBe("conversion_approved");

    const storedResult = getConversionVerificationResult(quote.conversionQuoteId);
    expect(storedResult?.status).toBe("conversion_approved");

    const updatedQuote = getConversionQuote(quote.conversionQuoteId);
    expect(updatedQuote?.status).toBe("completed");

    const reserves = getLiquidityReservesForQuote(quote.conversionQuoteId);
    expect(reserves.length).toBe(1);
    expect(reserves[0]?.amount).toBe(24.5);
  });

  it("marks quote rejected when conversion fails", () => {
    const quote = createConversionQuote({
      walletId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      sourceCoin: "W",
      targetCoin: "I",
      sourceAmount: 100,
      conversionRate: 0.25,
      conversionFeeRate: 0.02,
      sourceState: "available"
    });

    const result = verifyStoredConversionQuote({
      conversionQuoteId: quote.conversionQuoteId,

      availableSourceBalance: 10,

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

      ageBand: "18_plus"
    });

    expect(result.status).toBe("conversion_rejected");

    const updatedQuote = getConversionQuote(quote.conversionQuoteId);
    expect(updatedQuote?.status).toBe("rejected");
  });
});
