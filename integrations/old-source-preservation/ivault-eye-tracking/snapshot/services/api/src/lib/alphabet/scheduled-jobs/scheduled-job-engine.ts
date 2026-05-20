import { getScheduledJobRule } from "@/data/alphabet/scheduled-job-rules";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  ScheduledJobEvaluationResult,
  ScheduledJobOutcomeStatus,
  ScheduledJobSignalInput
} from "@/types/alphabet/scheduled-job.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function resolveActorUserId(triggeredByUserId?: string | null): string {
  if (triggeredByUserId) {
    const re =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (re.test(triggeredByUserId)) return triggeredByUserId;
  }
  return ALPHABET_SYSTEM_USER_ID;
}

function calculateJobReadinessScore(input: ScheduledJobSignalInput): number {
  let score = 0;

  score += input.active ? 0.18 : 0;
  score += input.jobKey ? 0.12 : 0;
  score += input.jobCategory ? 0.1 : 0;
  score += input.maxRuntimeSeconds > 0 ? 0.08 : 0;
  score += input.lockTtlSeconds > 0 ? 0.08 : 0;
  score += input.triggerSource === "cron" || input.triggerSource === "manual_admin" ? 0.08 : 0;

  score += input.safetyScores.jobReadinessScore * 0.18;
  score += input.safetyScores.executionSafetyScore * 0.12;
  score += input.safetyScores.lockSafetyScore * 0.06;

  return clamp(score);
}

function calculateJobExecutionSafetyScore(input: ScheduledJobSignalInput): number {
  let score = 1;

  score -= !input.active ? 0.35 : 0;
  score -= input.lockExists && !input.lockExpired ? 0.45 : 0;
  score -= input.attempt > input.retryLimit ? 0.25 : 0;
  score -= input.previousFailureCount > 3 ? 0.15 : 0;

  score += input.safetyScores.executionSafetyScore * 0.12;
  score += input.safetyScores.resultIntegrityScore * 0.08;
  score += input.safetyScores.retrySafetyScore * 0.06;

  return clamp(score);
}

function decideScheduledJobOutcome(params: {
  input: ScheduledJobSignalInput;
  readinessScore: number;
  executionSafetyScore: number;
  reasons: string[];
}): ScheduledJobOutcomeStatus {
  const { input, readinessScore, executionSafetyScore, reasons } = params;
  const rule = getScheduledJobRule(input.jobKey);

  if (!rule) {
    reasons.push("scheduled_job_no_active_rule");
    return "job_failed";
  }

  if (!input.active) {
    reasons.push("scheduled_job_inactive");
    return "job_run_blocked";
  }

  if (rule.requiresLock && input.lockExists && !input.lockExpired) {
    reasons.push("scheduled_job_lock_active");
    return "job_skip_locked";
  }

  if (input.safetyScores.jobReadinessScore < rule.minJobReadinessScore) {
    reasons.push("scheduled_job_readiness_score_below_minimum");
    return "job_run_blocked";
  }

  if (input.safetyScores.lockSafetyScore < rule.minLockSafetyScore) {
    reasons.push("scheduled_job_lock_safety_below_minimum");
    return "job_run_blocked";
  }

  if (input.safetyScores.executionSafetyScore < rule.minExecutionSafetyScore) {
    reasons.push("scheduled_job_execution_safety_below_minimum");
    return "job_run_blocked";
  }

  if (readinessScore < rule.minJobReadinessScore) {
    reasons.push("scheduled_job_readiness_below_minimum");
    return "job_run_blocked";
  }

  if (executionSafetyScore < rule.minExecutionSafetyScore) {
    reasons.push("scheduled_job_execution_safety_below_minimum");
    return "job_run_blocked";
  }

  if (input.currentStatus === "job_completed") {
    reasons.push("scheduled_job_completed");
    return "job_completed";
  }

  if (input.currentStatus === "job_failed") {
    if (
      input.attempt <= input.retryLimit &&
      input.safetyScores.retrySafetyScore >= rule.minRetrySafetyScore
    ) {
      reasons.push("scheduled_job_retry_allowed");
      return "job_retry_allowed";
    }

    reasons.push("scheduled_job_dead_letter");
    return "job_dead_letter";
  }

  reasons.push("scheduled_job_run_allowed");
  return "job_run_allowed";
}

function createScheduledJobEvent(params: {
  input: ScheduledJobSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: resolveActorUserId(params.input.triggeredByUserId),
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
      jobKey: params.input.jobKey,
      jobCategory: params.input.jobCategory,
      triggerSource: params.input.triggerSource,
      lockKey: params.input.lockKey,
      attempt: params.input.attempt,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateScheduledJob(input: ScheduledJobSignalInput): ScheduledJobEvaluationResult {
  const reasons: string[] = [];

  const readinessScore = calculateJobReadinessScore(input);
  const executionSafetyScore = calculateJobExecutionSafetyScore(input);

  const status = decideScheduledJobOutcome({
    input,
    readinessScore,
    executionSafetyScore,
    reasons
  });

  const shouldRun = status === "job_run_allowed" || status === "job_retry_allowed";
  const shouldSkip = status === "job_skip_locked";
  const shouldRetry = status === "job_retry_allowed";
  const shouldDeadLetter = status === "job_dead_letter";
  const failed = status === "job_failed" || status === "job_run_blocked";
  const completed = status === "job_completed";

  const verificationStatus: AlphabetEvent["verificationStatus"] =
    shouldRun || completed ? "verified" : "rejected";

  const base = {
    rawScore: readinessScore,
    qualityScore: executionSafetyScore,
    riskScore: 1 - executionSafetyScore,
    verificationStatus,
    metadata: { status, reasons }
  };

  const scheduledJobCreatedEvent = createScheduledJobEvent({
    input,
    eventType: "scheduled_job_created",
    ...base
  });

  const scheduledJobLockedEvent = shouldRun
    ? createScheduledJobEvent({
        input,
        eventType: "scheduled_job_locked",
        ...base
      })
    : null;

  const scheduledJobStartedEvent = shouldRun
    ? createScheduledJobEvent({
        input,
        eventType: "scheduled_job_started",
        ...base
      })
    : null;

  const scheduledJobCompletedEvent = completed
    ? createScheduledJobEvent({
        input,
        eventType: "scheduled_job_completed",
        ...base
      })
    : null;

  const scheduledJobFailedEvent = failed
    ? createScheduledJobEvent({
        input,
        eventType: "scheduled_job_failed",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const scheduledJobSkippedEvent = shouldSkip
    ? createScheduledJobEvent({
        input,
        eventType: "scheduled_job_skipped",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const scheduledJobTimedOutEvent = null;

  const scheduledJobDeadLetteredEvent = shouldDeadLetter
    ? createScheduledJobEvent({
        input,
        eventType: "scheduled_job_dead_lettered",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  return {
    status,
    jobKey: input.jobKey,
    jobCategory: input.jobCategory,
    shouldRun,
    shouldSkip,
    shouldRetry,
    shouldDeadLetter,
    failed,
    completed,
    lockKey: input.lockKey,
    jobReadinessScore: readinessScore,
    jobExecutionSafetyScore: executionSafetyScore,
    reasons,
    scheduledJobCreatedEvent,
    scheduledJobLockedEvent,
    scheduledJobStartedEvent,
    scheduledJobCompletedEvent,
    scheduledJobFailedEvent,
    scheduledJobSkippedEvent,
    scheduledJobTimedOutEvent,
    scheduledJobDeadLetteredEvent,
    metadata: input.metadata ?? {}
  };
}
