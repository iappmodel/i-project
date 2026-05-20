import type { ConversionVerificationResult } from "../../types/alphabet/conversion.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromConversionVerification(
  result: ConversionVerificationResult
): TrustImpactEvent | null {
  if (result.status === "conversion_approved") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "conversion_completed_clean",
      category: "payment",
      severity: "positive_small",
      sourceEventId:
        result.conversionCompletedEvent?.eventId ??
        result.conversionApprovedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        conversionQuoteId: result.conversionQuoteId,
        walletId: result.walletId,
        sourceCoin: result.sourceCoin,
        targetCoin: result.targetCoin,
        sourceAmount: result.sourceAmount,
        targetAmount: result.targetAmount,
        conversionEligibilityScore: result.conversionEligibilityScore,
        liquidityScore: result.liquidityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "suspicious") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "conversion_fraud_detected",
      category: "payment",
      severity: "negative_large",
      sourceEventId:
        result.conversionFraudEvent?.eventId ??
        result.quoteCreatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        conversionQuoteId: result.conversionQuoteId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "wallet_locked") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "wallet_conversion_blocked",
      category: "payment",
      severity: "negative_small",
      sourceEventId:
        result.conversionRejectedEvent?.eventId ??
        result.quoteCreatedEvent.eventId,
      confidence: 0.65,
      metadata: {
        conversionQuoteId: result.conversionQuoteId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromConversionVerification(
  result: ConversionVerificationResult
): UValueImpactEvent | null {
  if (result.status === "conversion_approved") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "conversion_completed",
      category: "economic",
      severity: "positive_small",
      coinCode: "V",
      sourceEventId:
        result.conversionCompletedEvent?.eventId ??
        result.vCoinEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        conversionQuoteId: result.conversionQuoteId,
        walletId: result.walletId,
        sourceCoin: result.sourceCoin,
        targetCoin: result.targetCoin,
        sourceAmount: result.sourceAmount,
        targetAmount: result.targetAmount,
        conversionEligibilityScore: result.conversionEligibilityScore,
        liquidityScore: result.liquidityScore
      }
    });
  }

  if (result.status === "suspicious") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "conversion_fraud_detected",
      category: "economic",
      severity: "negative_large",
      coinCode: "V",
      sourceEventId:
        result.conversionFraudEvent?.eventId ??
        result.quoteCreatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        conversionQuoteId: result.conversionQuoteId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
