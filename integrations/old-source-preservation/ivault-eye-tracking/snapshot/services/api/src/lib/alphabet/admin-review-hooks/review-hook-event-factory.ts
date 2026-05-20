import type { AdminReviewHookEvaluationResult } from "@/types/alphabet/admin-review-hooks.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromAdminReviewHookResult(
  result: AdminReviewHookEvaluationResult
): TrustImpactEvent | null {
  if (result.shouldCreateCase) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "admin_review_hook_created_case",
      category: "reputation",
      severity: "negative_small",
      sourceEventId: result.adminReviewHookCaseCreatedEvent?.eventId ?? null,
      confidence: result.reviewNecessityScore,
      metadata: {
        hookSource: result.hookSource,
        hookTrigger: result.hookTrigger,
        reasons: result.reasons
      }
    });
  }

  if (result.skipDuplicate) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "admin_review_hook_duplicate_skipped",
      category: "reputation",
      severity: "positive_small",
      sourceEventId: result.adminReviewHookDuplicateSkippedEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        hookSource: result.hookSource,
        hookTrigger: result.hookTrigger
      }
    });
  }

  if (result.failed || result.blocked) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "admin_review_hook_failed",
      category: "reputation",
      severity: "negative_medium",
      sourceEventId:
        result.adminReviewHookFailedEvent?.eventId ??
        result.adminReviewHookBlockedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        hookSource: result.hookSource,
        hookTrigger: result.hookTrigger,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromAdminReviewHookResult(
  result: AdminReviewHookEvaluationResult
): UValueImpactEvent | null {
  if (result.shouldCreateCase) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "admin_review_hook_case_created",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.adminReviewHookCaseCreatedEvent?.eventId ?? null,
      confidence: result.reviewNecessityScore,
      metadata: {
        hookSource: result.hookSource,
        hookTrigger: result.hookTrigger
      }
    });
  }

  if (result.failed) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "admin_review_hook_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId: result.adminReviewHookFailedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        hookSource: result.hookSource,
        hookTrigger: result.hookTrigger,
        reasons: result.reasons
      }
    });
  }

  return null;
}
