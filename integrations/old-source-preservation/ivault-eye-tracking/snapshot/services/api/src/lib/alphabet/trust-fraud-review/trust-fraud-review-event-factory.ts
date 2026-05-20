import type { TrustFraudReviewEvaluationResult } from "@/types/alphabet/trust-fraud-review.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromTrustFraudReviewResult(
  result: TrustFraudReviewEvaluationResult
): TrustImpactEvent | null {
  if (result.clean || result.warning) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "trust_fraud_review_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.trustFraudReviewCompletedEvent?.eventId ??
        result.trustFraudReviewWarningEvent?.eventId ??
        null,
      confidence: result.batchConfidenceScore,
      metadata: {
        batchScope: result.batchScope,
        batchDate: result.batchDate,
        status: result.status
      }
    });
  }

  if (result.failed || result.critical || result.requiresReview) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "trust_fraud_review_failed",
      category: "reputation",
      severity: result.requiresReview || result.critical ? "negative_medium" : "negative_small",
      sourceEventId:
        result.trustFraudReviewRequiredEvent?.eventId ??
        result.trustFraudReviewCriticalEvent?.eventId ??
        result.trustFraudReviewFailedEvent?.eventId ??
        null,
      confidence: result.batchConfidenceScore,
      metadata: {
        batchScope: result.batchScope,
        batchDate: result.batchDate,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromTrustFraudReviewResult(
  result: TrustFraudReviewEvaluationResult
): UValueImpactEvent | null {
  if (result.clean || result.warning) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "trust_fraud_review_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId:
        result.trustFraudReviewCompletedEvent?.eventId ??
        result.trustFraudReviewWarningEvent?.eventId ??
        null,
      confidence: result.batchConfidenceScore,
      metadata: {
        batchScope: result.batchScope,
        batchDate: result.batchDate
      }
    });
  }

  if (result.failed || result.critical || result.requiresReview) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "trust_fraud_review_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.trustFraudReviewRequiredEvent?.eventId ??
        result.trustFraudReviewCriticalEvent?.eventId ??
        result.trustFraudReviewFailedEvent?.eventId ??
        null,
      confidence: result.batchConfidenceScore,
      metadata: {
        batchScope: result.batchScope,
        batchDate: result.batchDate,
        reasons: result.reasons
      }
    });
  }

  return null;
}
