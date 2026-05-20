import type { CreatorPayoutResult } from "../../types/alphabet/creator-payout.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromCreatorPayout(
  result: CreatorPayoutResult
): TrustImpactEvent | null {
  if (result.status === "payout_approved") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "creator_payout_clean",
      category: "payment",
      severity: "positive_small",
      sourceEventId:
        result.creatorPayoutApprovedEvent?.eventId ??
        result.creatorPayoutCompletedEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        creatorPayoutId: result.creatorPayoutId,
        creatorId: result.creatorId,
        revenueSource: result.revenueSource,
        distributableAmount: result.distributableAmount,
        payoutEligibilityScore: result.payoutEligibilityScore,
        revenueQualityScore: result.revenueQualityScore
      }
    });
  }

  if (result.status === "payout_suspicious") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "creator_payout_fraud_detected",
      category: "payment",
      severity: "negative_large",
      sourceEventId:
        result.creatorPayoutFraudDetectedEvent?.eventId ??
        result.creatorPayoutCreatedEvent.eventId,
      confidence: 0.85,
      metadata: {
        creatorPayoutId: result.creatorPayoutId,
        creatorId: result.creatorId,
        reasons: result.reasons,
        payoutRiskScore: result.payoutRiskScore
      }
    });
  }

  if (result.status === "payout_reversed") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "creator_payout_reversed",
      category: "payment",
      severity: "negative_medium",
      sourceEventId:
        result.creatorPayoutReversedEvent?.eventId ??
        result.creatorPayoutCreatedEvent.eventId,
      confidence: 0.75,
      metadata: {
        creatorPayoutId: result.creatorPayoutId,
        creatorId: result.creatorId,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromCreatorPayout(
  result: CreatorPayoutResult
): UValueImpactEvent | null {
  if (result.status === "payout_approved") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "creator_payout_approved",
      category: "economic",
      severity: "positive_medium",
      coinCode: "I",
      sourceEventId: result.creatorPayoutApprovedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        creatorPayoutId: result.creatorPayoutId,
        creatorId: result.creatorId,
        distributableAmount: result.distributableAmount
      }
    });
  }

  if (result.status === "payout_disputed") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "creator_payout_disputed",
      category: "economic",
      severity: "negative_small",
      coinCode: "I",
      sourceEventId: result.creatorPayoutDisputedEvent?.eventId ?? null,
      confidence: 0.65,
      metadata: {
        creatorPayoutId: result.creatorPayoutId,
        creatorId: result.creatorId,
        reasons: result.reasons
      }
    });
  }

  if (result.status === "payout_suspicious" || result.status === "payout_reversed") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType:
        result.status === "payout_suspicious"
          ? "creator_payout_fraud_detected"
          : "creator_payout_reversed",
      category: "economic",
      severity: "negative_large",
      coinCode: "I",
      sourceEventId:
        result.creatorPayoutFraudDetectedEvent?.eventId ??
        result.creatorPayoutReversedEvent?.eventId ??
        result.creatorPayoutCreatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        creatorPayoutId: result.creatorPayoutId,
        creatorId: result.creatorId,
        reasons: result.reasons,
        payoutRiskScore: result.payoutRiskScore
      }
    });
  }

  return null;
}
