import type { ProviderReconciliationEvaluationResult } from "@/types/alphabet/provider-reconciliation.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromProviderReconciliationResult(
  result: ProviderReconciliationEvaluationResult
): TrustImpactEvent | null {
  if (result.applySuccess || result.applyPending) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "provider_reconciliation_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.providerReconciliationAppliedEvent?.eventId ??
        result.providerReconciliationMatchedEvent?.eventId ??
        null,
      confidence: result.reconciliationConfidenceScore,
      metadata: {
        reconciliationId: result.reconciliationId,
        provider: result.provider,
        status: result.status
      }
    });
  }

  if (result.failed || result.requiresReview || result.unmatched || result.applyUnknown) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "provider_reconciliation_risk_detected",
      category: "reputation",
      severity: result.failed ? "negative_medium" : "negative_small",
      sourceEventId:
        result.providerReconciliationFailedEvent?.eventId ??
        result.providerReconciliationRequiresReviewEvent?.eventId ??
        result.providerReconciliationUnmatchedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        reconciliationId: result.reconciliationId,
        provider: result.provider,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromProviderReconciliationResult(
  result: ProviderReconciliationEvaluationResult
): UValueImpactEvent | null {
  if (result.applySuccess) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "provider_reconciliation_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.providerReconciliationAppliedEvent?.eventId ?? null,
      confidence: result.reconciliationSafetyScore,
      metadata: {
        reconciliationId: result.reconciliationId,
        provider: result.provider
      }
    });
  }

  if (result.failed || result.requiresReview || result.applyUnknown) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "provider_reconciliation_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.providerReconciliationFailedEvent?.eventId ??
        result.providerReconciliationRequiresReviewEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        reconciliationId: result.reconciliationId,
        provider: result.provider,
        reasons: result.reasons
      }
    });
  }

  return null;
}
