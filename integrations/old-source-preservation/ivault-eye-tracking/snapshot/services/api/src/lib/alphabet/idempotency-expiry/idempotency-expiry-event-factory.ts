import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import type { IdempotencyExpiryEvaluationResult } from "@/types/alphabet/idempotency-expiry.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromIdempotencyExpiryResult(
  result: IdempotencyExpiryEvaluationResult
): TrustImpactEvent | null {
  if (result.passed || result.archived || result.suppressed) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "idempotency_expiry_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.archivedEvent?.eventId ??
        result.suppressedEvent?.eventId ??
        result.completedEvent?.eventId ??
        null,
      confidence: result.expiryConfidenceScore,
      metadata: {
        expiryType: result.expiryType,
        expiryScope: result.expiryScope,
        status: result.status
      }
    });
  }

  if (result.failed || result.critical) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "idempotency_expiry_failed",
      category: "reputation",
      severity: result.critical ? "negative_medium" : "negative_small",
      sourceEventId: result.criticalEvent?.eventId ?? result.failedEvent?.eventId ?? null,
      confidence: result.expiryConfidenceScore,
      metadata: {
        expiryType: result.expiryType,
        expiryScope: result.expiryScope,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromIdempotencyExpiryResult(
  result: IdempotencyExpiryEvaluationResult
): UValueImpactEvent | null {
  if (result.passed || result.archived || result.suppressed) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "idempotency_expiry_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId:
        result.archivedEvent?.eventId ??
        result.suppressedEvent?.eventId ??
        result.completedEvent?.eventId ??
        null,
      confidence: result.expiryConfidenceScore,
      metadata: {
        expiryType: result.expiryType,
        expiryScope: result.expiryScope
      }
    });
  }

  if (result.failed || result.critical) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "idempotency_expiry_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.criticalEvent?.eventId ?? result.failedEvent?.eventId ?? null,
      confidence: result.expiryConfidenceScore,
      metadata: {
        expiryType: result.expiryType,
        expiryScope: result.expiryScope,
        reasons: result.reasons
      }
    });
  }

  return null;
}
