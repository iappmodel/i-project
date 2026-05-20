import type { WorkVerificationResult } from "../../types/alphabet/work.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromWorkVerification(
  result: WorkVerificationResult
): TrustImpactEvent | null {
  if (result.status === "work_verified" || result.status === "exchange_verified") {
    return createTrustImpactEvent({
      userId: result.workerUserId,
      eventType:
        result.status === "exchange_verified"
          ? "exchange_completed_clean"
          : "task_completed_clean",
      category: result.status === "exchange_verified" ? "exchange" : "work",
      severity: "positive_medium",
      sourceEventId:
        result.exchangeCompletedEvent?.eventId ??
        result.workVerifiedEvent?.eventId ??
        result.workDeliveredEvent.eventId,
      confidence: result.status === "exchange_verified" ? 0.85 : 0.75,
      metadata: {
        workTaskId: result.workTaskId,
        clientUserId: result.clientUserId ?? null,
        businessId: result.businessId ?? null,
        workScore: result.workScore,
        exchangeScore: result.exchangeScore,
        qualityScore: result.qualityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "disputed") {
    return createTrustImpactEvent({
      userId: result.workerUserId,
      eventType: "dispute_opened",
      category: "exchange",
      severity: "negative_small",
      sourceEventId: result.disputeEvent?.eventId ?? result.workDeliveredEvent.eventId,
      confidence: 0.65,
      metadata: {
        workTaskId: result.workTaskId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "suspicious") {
    return createTrustImpactEvent({
      userId: result.workerUserId,
      eventType: "task_fraud_detected",
      category: "work",
      severity: "negative_large",
      sourceEventId: result.fraudEvent?.eventId ?? result.workDeliveredEvent.eventId,
      confidence: 0.75,
      metadata: {
        workTaskId: result.workTaskId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromWorkVerification(
  result: WorkVerificationResult
): UValueImpactEvent | null {
  if (result.status === "exchange_verified") {
    return createUValueImpactEvent({
      userId: result.workerUserId,
      eventType: "exchange_clean",
      category: "exchange",
      severity: "positive_medium",
      coinCode: "X",
      sourceEventId: result.exchangeCompletedEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        workTaskId: result.workTaskId,
        workScore: result.workScore,
        exchangeScore: result.exchangeScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (result.status === "work_verified") {
    return createUValueImpactEvent({
      userId: result.workerUserId,
      eventType: "work_completed",
      category: "work",
      severity: "positive_medium",
      coinCode: "W",
      sourceEventId: result.workVerifiedEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        workTaskId: result.workTaskId,
        workScore: result.workScore,
        exchangeScore: result.exchangeScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (result.status === "suspicious") {
    return createUValueImpactEvent({
      userId: result.workerUserId,
      eventType: "fraud_detected",
      category: "work",
      severity: "negative_large",
      coinCode: "W",
      sourceEventId: result.fraudEvent?.eventId ?? result.workDeliveredEvent.eventId,
      confidence: 0.75,
      metadata: {
        workTaskId: result.workTaskId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
