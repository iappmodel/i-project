import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import type { WithdrawalVerificationResult } from "../../types/alphabet/withdrawal.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromWithdrawalVerification(
  result: WithdrawalVerificationResult
): TrustImpactEvent | null {
  if (result.status === "withdrawal_approved") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "withdrawal_completed_clean",
      category: "payment",
      severity: "positive_small",
      sourceEventId:
        result.payoutCompletedEvent?.eventId ??
        result.withdrawalApprovedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        withdrawalRequestId: result.withdrawalRequestId,
        walletId: result.walletId,
        requestedAmount: result.requestedAmount,
        payoutAmount: result.payoutAmount,
        feeAmount: result.feeAmount,
        withdrawalEligibilityScore: result.withdrawalEligibilityScore,
        complianceScore: result.complianceScore,
        payoutSafetyScore: result.payoutSafetyScore,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "suspicious") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "withdrawal_fraud_detected",
      category: "payment",
      severity: "negative_large",
      sourceEventId:
        result.withdrawalFraudEvent?.eventId ?? result.withdrawalRequestedEvent.eventId,
      confidence: 0.85,
      metadata: {
        withdrawalRequestId: result.withdrawalRequestId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "compliance_blocked") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "compliance_blocked",
      category: "payment",
      severity: "negative_large",
      sourceEventId:
        result.complianceBlockedEvent?.eventId ?? result.withdrawalRequestedEvent.eventId,
      confidence: 0.9,
      metadata: {
        withdrawalRequestId: result.withdrawalRequestId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "withdrawal_held" || result.status === "withdrawal_pending_review") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "withdrawal_held_for_review",
      category: "payment",
      severity: "negative_small",
      sourceEventId: result.withdrawalHeldEvent?.eventId ?? result.withdrawalRequestedEvent.eventId,
      confidence: 0.65,
      metadata: {
        withdrawalRequestId: result.withdrawalRequestId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromWithdrawalVerification(
  result: WithdrawalVerificationResult
): UValueImpactEvent | null {
  if (result.status === "withdrawal_approved") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "withdrawal_completed",
      category: "economic",
      severity: "positive_small",
      coinCode: "I",
      sourceEventId:
        result.payoutCompletedEvent?.eventId ??
        result.withdrawalApprovedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        withdrawalRequestId: result.withdrawalRequestId,
        walletId: result.walletId,
        requestedAmount: result.requestedAmount,
        payoutAmount: result.payoutAmount,
        feeAmount: result.feeAmount
      }
    });
  }

  if (result.status === "suspicious") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "withdrawal_fraud_detected",
      category: "economic",
      severity: "negative_large",
      coinCode: "I",
      sourceEventId:
        result.withdrawalFraudEvent?.eventId ?? result.withdrawalRequestedEvent.eventId,
      confidence: 0.85,
      metadata: {
        withdrawalRequestId: result.withdrawalRequestId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "compliance_blocked") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "compliance_blocked",
      category: "economic",
      severity: "negative_large",
      coinCode: "I",
      sourceEventId:
        result.complianceBlockedEvent?.eventId ?? result.withdrawalRequestedEvent.eventId,
      confidence: 0.9,
      metadata: {
        withdrawalRequestId: result.withdrawalRequestId,
        walletId: result.walletId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
