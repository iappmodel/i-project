import type { ExternalTransferEvaluationResult } from "@/types/alphabet/external-transfer.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromExternalTransferResult(
  result: ExternalTransferEvaluationResult
): TrustImpactEvent | null {
  if (result.completed || result.providerPending) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "external_transfer_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.externalTransferCompletedEvent?.eventId ??
        result.externalTransferProviderPendingEvent?.eventId ??
        null,
      confidence: result.transferSafetyScore,
      metadata: {
        externalTransferId: result.externalTransferId,
        transferType: result.transferType,
        provider: result.provider,
        status: result.status
      }
    });
  }

  if (result.failed || result.blocked || result.unknown || result.compensationRequired) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "external_transfer_risk_detected",
      category: "reputation",
      severity: result.unknown || result.compensationRequired ? "negative_medium" : "negative_small",
      sourceEventId:
        result.externalTransferProviderUnknownEvent?.eventId ??
        result.externalTransferCompensationRequiredEvent?.eventId ??
        result.externalTransferFailedEvent?.eventId ??
        result.externalTransferBlockedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        externalTransferId: result.externalTransferId,
        transferType: result.transferType,
        provider: result.provider,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromExternalTransferResult(
  result: ExternalTransferEvaluationResult
): UValueImpactEvent | null {
  if (result.completed) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "external_transfer_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: result.coinCode ?? "J",
      sourceEventId: result.externalTransferCompletedEvent?.eventId ?? null,
      confidence: result.transferSafetyScore,
      metadata: {
        externalTransferId: result.externalTransferId,
        transferType: result.transferType
      }
    });
  }

  if (result.failed || result.unknown || result.compensationRequired) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "external_transfer_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: result.coinCode ?? "J",
      sourceEventId:
        result.externalTransferFailedEvent?.eventId ??
        result.externalTransferProviderUnknownEvent?.eventId ??
        result.externalTransferCompensationRequiredEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        externalTransferId: result.externalTransferId,
        transferType: result.transferType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
