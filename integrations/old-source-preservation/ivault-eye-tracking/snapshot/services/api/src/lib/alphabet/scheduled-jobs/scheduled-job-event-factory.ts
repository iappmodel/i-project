import type { ScheduledJobEvaluationResult } from "@/types/alphabet/scheduled-job.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromScheduledJobResult(
  result: ScheduledJobEvaluationResult
): TrustImpactEvent | null {
  if (result.completed || result.shouldRun) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "scheduled_job_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.scheduledJobCompletedEvent?.eventId ??
        result.scheduledJobStartedEvent?.eventId ??
        null,
      confidence: result.jobExecutionSafetyScore,
      metadata: {
        jobKey: result.jobKey,
        status: result.status
      }
    });
  }

  if (result.failed || result.shouldDeadLetter) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "scheduled_job_failed",
      category: "reputation",
      severity: "negative_small",
      sourceEventId:
        result.scheduledJobFailedEvent?.eventId ??
        result.scheduledJobDeadLetteredEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        jobKey: result.jobKey,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromScheduledJobResult(
  result: ScheduledJobEvaluationResult
): UValueImpactEvent | null {
  if (result.completed) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "scheduled_job_completed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.scheduledJobCompletedEvent?.eventId ?? null,
      confidence: result.jobExecutionSafetyScore,
      metadata: {
        jobKey: result.jobKey
      }
    });
  }

  if (result.failed || result.shouldDeadLetter) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "scheduled_job_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.scheduledJobFailedEvent?.eventId ??
        result.scheduledJobDeadLetteredEvent?.eventId ??
        null,
      confidence: 0.7,
      metadata: {
        jobKey: result.jobKey,
        reasons: result.reasons
      }
    });
  }

  return null;
}
