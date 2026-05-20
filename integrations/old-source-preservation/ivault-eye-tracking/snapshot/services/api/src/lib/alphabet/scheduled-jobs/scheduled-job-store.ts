import { getScheduledJobRule } from "@/data/alphabet/scheduled-job-rules";
import type {
  ScheduledJobCategory,
  ScheduledJobKey,
  ScheduledJobSafetyScores,
  ScheduledJobTriggerSource
} from "@/types/alphabet/scheduled-job.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import { evaluateScheduledJob } from "./scheduled-job-engine";
import {
  getScheduledJobDefinitionDb,
  insertScheduledJobRunDb,
  updateScheduledJobRunDb
} from "../db-repositories/scheduled-jobs.repository";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import { acquireScheduledJobLock, inspectScheduledJobLock, releaseScheduledJobLock } from "./scheduled-job-locker";
import { runScheduledJobHandler } from "./scheduled-job-registry";
import { createOperationalAlertFromPartial } from "../operational-alerts/operational-alert-store";

function defaultScores(overrides?: Partial<ScheduledJobSafetyScores>): ScheduledJobSafetyScores {
  return {
    jobReadinessScore: overrides?.jobReadinessScore ?? 0.95,
    lockSafetyScore: overrides?.lockSafetyScore ?? 0.95,
    executionSafetyScore: overrides?.executionSafetyScore ?? 0.95,
    resultIntegrityScore: overrides?.resultIntegrityScore ?? 0.9,
    retrySafetyScore: overrides?.retrySafetyScore ?? 0.8
  };
}

async function persistAlphabetEventFromEvaluation(event: AlphabetEvent | null | undefined): Promise<string | null> {
  if (!event) return null;

  const { event_id } = await insertAlphabetEvent({
    userId: event.userId,
    coinCode: event.coinCode ?? null,
    eventType: event.eventType,
    objectType: event.objectType ?? null,
    objectId: event.objectId ?? null,
    sourceContext: event.sourceContext,
    rawScore: event.rawScore ?? null,
    qualityScore: event.qualityScore ?? null,
    trustScoreAtEvent: event.trustScoreAtEvent ?? null,
    riskScore: event.riskScore ?? null,
    ageBand: event.ageBand ?? null,
    verificationStatus: event.verificationStatus,
    metadata: {
      ...(event.metadata ?? {}),
      syntheticEventId: event.eventId
    }
  });

  return event_id;
}

async function persistEvaluationEvents(events: Array<AlphabetEvent | null | undefined>) {
  const ids: string[] = [];
  for (const event of events) {
    const id = await persistAlphabetEventFromEvaluation(event);
    if (id) ids.push(id);
  }
  return ids;
}

async function persistLifecycleEvent(params: {
  eventType: AlphabetEvent["eventType"];
  jobKey: ScheduledJobKey;
  jobCategory: string;
  triggerSource: ScheduledJobTriggerSource;
  triggeredByUserId?: string | null;
  lockKey: string;
  attempt: number;
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  extra?: Record<string, unknown>;
}) {
  const userId = params.triggeredByUserId ?? ALPHABET_SYSTEM_USER_ID;

  const { event_id } = await insertAlphabetEvent({
    userId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "scheduled_job",
    objectId: null,
    sourceContext: "scheduled_job",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      jobKey: params.jobKey,
      jobCategory: params.jobCategory,
      triggerSource: params.triggerSource,
      lockKey: params.lockKey,
      attempt: params.attempt,
      ...(params.extra ?? {})
    }
  });

  return event_id;
}

export async function runScheduledJob(params: {
  jobKey: ScheduledJobKey;
  triggerSource?: ScheduledJobTriggerSource;
  triggeredByUserId?: string | null;
  lockedBy?: string;
  safetyScores?: Partial<ScheduledJobSafetyScores>;
}) {
  const rule = getScheduledJobRule(params.jobKey);
  if (params.triggerSource === "manual_admin" && (!rule || !rule.allowManualTrigger)) {
    throw new Error("Manual trigger not allowed for this job.");
  }

  const definition = await getScheduledJobDefinitionDb(params.jobKey);

  if (!definition) {
    throw new Error(`Scheduled job definition not found: ${params.jobKey}`);
  }

  const lockedBy =
    params.lockedBy ?? `${params.triggerSource ?? "cron"}:${process.env.VERCEL_REGION ?? "local"}`;

  const lockState = await inspectScheduledJobLock(params.jobKey);
  const scores = defaultScores(params.safetyScores);

  const evaluation = evaluateScheduledJob({
    jobKey: params.jobKey,
    jobCategory: definition.job_category as ScheduledJobCategory,
    active: Boolean(definition.active),
    currentStatus: "job_created",
    triggerSource: params.triggerSource ?? "cron",
    triggeredByUserId: params.triggeredByUserId ?? null,
    lockExists: lockState.lockExists,
    lockExpired: lockState.lockExpired,
    lockKey: lockState.lockKey,
    lockedBy,
    attempt: 1,
    retryLimit: Number(definition.retry_limit),
    maxRuntimeSeconds: Number(definition.max_runtime_seconds),
    lockTtlSeconds: Number(definition.lock_ttl_seconds),
    previousFailureCount: 0,
    safetyScores: scores,
    now: new Date().toISOString(),
    metadata: { definition }
  });

  const jobCategory = String(definition.job_category);

  const evaluationFixed = {
    ...evaluation,
    jobCategory: jobCategory as typeof evaluation.jobCategory
  };

  const earlyEventIds = await persistEvaluationEvents([
    evaluationFixed.scheduledJobCreatedEvent,
    evaluationFixed.scheduledJobSkippedEvent,
    evaluationFixed.scheduledJobFailedEvent,
    evaluationFixed.scheduledJobDeadLetteredEvent
  ]);

  if (!evaluationFixed.shouldRun) {
    return {
      ok: !evaluationFixed.failed && !evaluationFixed.shouldDeadLetter,
      jobRunId: null,
      jobKey: params.jobKey,
      status: evaluationFixed.status,
      evaluation: evaluationFixed,
      handlerResult: null,
      reasonCodes: evaluationFixed.reasons,
      eventIds: earlyEventIds
    };
  }

  const lockRow = await acquireScheduledJobLock({
    jobKey: params.jobKey,
    lockedBy,
    lockTtlSeconds: Number(definition.lock_ttl_seconds),
    metadata: {
      triggerSource: params.triggerSource ?? "cron"
    }
  });

  if (!lockRow) {
    const skipEval = evaluateScheduledJob({
      jobKey: params.jobKey,
      jobCategory: evaluationFixed.jobCategory,
      active: Boolean(definition.active),
      currentStatus: "job_created",
      triggerSource: params.triggerSource ?? "cron",
      triggeredByUserId: params.triggeredByUserId ?? null,
      lockExists: true,
      lockExpired: false,
      lockKey: lockState.lockKey,
      lockedBy,
      attempt: 1,
      retryLimit: Number(definition.retry_limit),
      maxRuntimeSeconds: Number(definition.max_runtime_seconds),
      lockTtlSeconds: Number(definition.lock_ttl_seconds),
      previousFailureCount: 0,
      safetyScores: scores,
      now: new Date().toISOString(),
      metadata: { definition, lockContention: true }
    });

    const skipIds = await persistEvaluationEvents([skipEval.scheduledJobSkippedEvent]);

    return {
      ok: true,
      jobRunId: null,
      jobKey: params.jobKey,
      status: skipEval.status,
      evaluation: skipEval,
      handlerResult: null,
      reasonCodes: [...skipEval.reasons, "scheduled_job_lock_contention"],
      eventIds: [...earlyEventIds, ...skipIds]
    };
  }

  const startedAt = new Date().toISOString();

  const run = await insertScheduledJobRunDb({
    jobKey: params.jobKey,
    jobCategory,
    status: "job_running",
    triggeredBy: params.triggerSource ?? "cron",
    triggeredByUserId: params.triggeredByUserId ?? null,
    attempts: 1,
    lockKey: lockState.lockKey,
    lockedBy,
    safetyScores: scores as never,
    reasonCodes: evaluationFixed.reasons,
    metadata: { evaluation: evaluationFixed } as never
  });

  const startedEventIds = await persistEvaluationEvents([
    evaluationFixed.scheduledJobLockedEvent,
    evaluationFixed.scheduledJobStartedEvent
  ]);

  try {
    const handlerResult = await runScheduledJobHandler(params.jobKey);

    const finalStatus = handlerResult.ok ? "job_completed" : "job_failed";

    const updatedRun = await updateScheduledJobRunDb({
      jobRunId: run.job_run_id as string,
      status: finalStatus,
      startedAt,
      resultPayload: handlerResult.resultPayload,
      errorPayload: handlerResult.errorPayload ?? {},
      sourceEventIds: handlerResult.sourceEventIds ?? [],
      createdAlertIds: handlerResult.createdAlertIds ?? [],
      createdReviewCaseIds: handlerResult.createdReviewCaseIds ?? [],
      scannedObjectCounts: handlerResult.scannedObjectCounts as never,
      mutationCounts: handlerResult.mutationCounts as never,
      reasonCodes: handlerResult.reasonCodes,
      metadata: {
        evaluation: evaluationFixed,
        handlerResult
      } as never
    });

    await releaseScheduledJobLock(params.jobKey);

    const tailIds: string[] = [];
    if (handlerResult.ok) {
      const eid = await persistLifecycleEvent({
        eventType: "scheduled_job_completed",
        jobKey: params.jobKey,
        jobCategory,
        triggerSource: params.triggerSource ?? "cron",
        triggeredByUserId: params.triggeredByUserId ?? null,
        lockKey: lockState.lockKey,
        attempt: 1,
        rawScore: evaluationFixed.jobReadinessScore,
        qualityScore: evaluationFixed.jobExecutionSafetyScore,
        riskScore: 1 - evaluationFixed.jobExecutionSafetyScore,
        verificationStatus: "verified",
        extra: { jobRunId: run.job_run_id }
      });
      if (eid) tailIds.push(eid);
    } else {
      const eid = await persistLifecycleEvent({
        eventType: "scheduled_job_failed",
        jobKey: params.jobKey,
        jobCategory,
        triggerSource: params.triggerSource ?? "cron",
        triggeredByUserId: params.triggeredByUserId ?? null,
        lockKey: lockState.lockKey,
        attempt: 1,
        rawScore: evaluationFixed.jobReadinessScore,
        qualityScore: evaluationFixed.jobExecutionSafetyScore,
        riskScore: 1 - evaluationFixed.jobExecutionSafetyScore,
        verificationStatus: "rejected",
        extra: { jobRunId: run.job_run_id, errorPayload: handlerResult.errorPayload }
      });
      if (eid) tailIds.push(eid);
    }

    if (!handlerResult.ok) {
      await createJobFailureAlert({
        jobKey: params.jobKey,
        jobCategory,
        jobRunId: run.job_run_id as string,
        errorPayload: (handlerResult.errorPayload ?? {}) as Record<string, unknown>,
        reasonCodes: handlerResult.reasonCodes
      });
    }

    return {
      ok: handlerResult.ok,
      jobRunId: run.job_run_id as string,
      jobKey: params.jobKey,
      status: updatedRun.status as string,
      evaluation: evaluationFixed,
      handlerResult,
      reasonCodes: handlerResult.reasonCodes,
      eventIds: [...earlyEventIds, ...startedEventIds, ...tailIds]
    };
  } catch (error) {
    await releaseScheduledJobLock(params.jobKey);

    const errorPayload = {
      message: error instanceof Error ? error.message : "Unknown scheduled job failure."
    };

    await updateScheduledJobRunDb({
      jobRunId: run.job_run_id as string,
      status: "job_failed",
      startedAt,
      errorPayload: errorPayload as never,
      reasonCodes: ["scheduled_job_handler_threw"],
      metadata: {
        evaluation: evaluationFixed,
        errorPayload
      } as never
    });

    const failEventId = await persistLifecycleEvent({
      eventType: "scheduled_job_failed",
      jobKey: params.jobKey,
      jobCategory,
      triggerSource: params.triggerSource ?? "cron",
      triggeredByUserId: params.triggeredByUserId ?? null,
      lockKey: lockState.lockKey,
      attempt: 1,
      rawScore: evaluationFixed.jobReadinessScore,
      qualityScore: evaluationFixed.jobExecutionSafetyScore,
      riskScore: 1 - evaluationFixed.jobExecutionSafetyScore,
      verificationStatus: "rejected",
      extra: { jobRunId: run.job_run_id, errorPayload }
    });

    await createJobFailureAlert({
      jobKey: params.jobKey,
      jobCategory,
      jobRunId: run.job_run_id as string,
      errorPayload,
      reasonCodes: ["scheduled_job_handler_threw"]
    });

    return {
      ok: false,
      jobRunId: run.job_run_id as string,
      jobKey: params.jobKey,
      status: "job_failed",
      evaluation: evaluationFixed,
      handlerResult: null,
      reasonCodes: ["scheduled_job_handler_threw"],
      eventIds: [...earlyEventIds, ...startedEventIds, ...(failEventId ? [failEventId] : [])]
    };
  }
}

async function createJobFailureAlert(params: {
  jobKey: string;
  jobCategory: string;
  jobRunId: string;
  errorPayload: Record<string, unknown>;
  reasonCodes: string[];
}) {
  const jobRule = getScheduledJobRule(params.jobKey);
  if (!jobRule?.createsAlertOnFailure) {
    return;
  }

  await createOperationalAlertFromPartial({
    alertType: "worker_dead_lettered",
    alertSource: "scheduled_scanner",
    linkedObjectIds: {},
    evidence: {
      jobKey: params.jobKey,
      jobCategory: params.jobCategory,
      jobRunId: params.jobRunId,
      errorPayload: params.errorPayload,
      reasonCodes: params.reasonCodes
    },
    publicSummary: "A scheduled system job failed.",
    internalSummary: `Scheduled job ${params.jobKey} failed.`,
    riskScores: {
      alertConfidenceScore: 0.9,
      financialRiskScore: params.jobCategory === "payments" ? 0.8 : 0.3,
      userImpactScore: params.jobCategory === "payments" ? 0.7 : 0.4,
      platformRiskScore: 0.75,
      exploitabilityScore: 0.2,
      urgencyScore: params.jobCategory === "payments" ? 0.85 : 0.55,
      recurrenceRiskScore: 0.5
    },
    metadata: {
      jobRunId: params.jobRunId
    }
  });
}

export async function listScheduledJobRuns(params?: {
  jobKey?: string | null;
  status?: string | null;
  limit?: number;
}) {
  const { listScheduledJobRunsDb } = await import("../db-repositories/scheduled-jobs.repository");
  return listScheduledJobRunsDb(params);
}

export async function getScheduledJobRun(jobRunId: string) {
  const { getScheduledJobRunDb } = await import("../db-repositories/scheduled-jobs.repository");
  return getScheduledJobRunDb(jobRunId);
}
