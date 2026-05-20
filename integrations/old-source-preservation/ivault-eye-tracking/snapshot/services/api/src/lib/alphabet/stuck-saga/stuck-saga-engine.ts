import { randomUUID } from "node:crypto";
import { getStuckSagaRule } from "@/data/alphabet/stuck-saga-rules";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { Json } from "@/types/alphabet/database.types";
import type {
  StuckSagaEvaluationResult,
  StuckSagaResultStatus,
  StuckSagaSeverity,
  StuckSagaSignalInput
} from "@/types/alphabet/stuck-saga.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function eventUserId(input: StuckSagaSignalInput): string {
  const uid = input.linkedObjectIds.userId;
  if (uid && UUID_RE.test(uid)) return uid;
  return ALPHABET_SYSTEM_USER_ID;
}

function eventObjectId(input: StuckSagaSignalInput): string | null {
  const candidates = [
    input.linkedObjectIds.sagaId,
    input.linkedObjectIds.pipelineId,
    input.linkedObjectIds.executionRequestId,
    input.linkedObjectIds.externalTransferId
  ];
  for (const c of candidates) {
    if (c && UUID_RE.test(c)) return c;
  }
  return null;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function calculateSeverityScore(input: StuckSagaSignalInput): number {
  let score = 0;

  score += input.riskScores.orchestrationRiskScore * 0.22;
  score += input.riskScores.financialExposureScore * 0.22;
  score += input.riskScores.userImpactScore * 0.14;
  score += input.riskScores.platformImpactScore * 0.14;
  score += input.riskScores.retryExhaustionScore * 0.12;
  score += input.riskScores.uncertaintyScore * 0.12;

  score += input.moneyMovementAffected ? 0.12 : 0;
  score += input.providerAffected ? 0.08 : 0;
  score += input.retryExhausted ? 0.12 : 0;
  score += input.moneyExposure.exposureAmount > 0 ? 0.1 : 0;
  score += input.moneyExposure.unknownAmount > 0 ? 0.12 : 0;

  if (
    input.timing.maxAllowedAgeSeconds > 0 &&
    input.timing.ageSeconds > input.timing.maxAllowedAgeSeconds
  ) {
    score += 0.08;
  }

  if (
    input.timing.maxAllowedStaleSeconds > 0 &&
    input.timing.staleSeconds > input.timing.maxAllowedStaleSeconds
  ) {
    score += 0.08;
  }

  return clamp(score);
}

function calculateConfidenceScore(input: StuckSagaSignalInput): number {
  let score = input.riskScores.confidenceScore * 0.75;

  score += input.evidence ? 0.08 : 0;
  score += Object.values(input.linkedObjectIds).some(Boolean) ? 0.1 : 0;
  score += input.timing.ageSeconds > 0 ? 0.04 : 0;
  score += input.sourceEventIds.length > 0 ? 0.03 : 0;

  return clamp(score);
}

function chooseSeverity(params: {
  input: StuckSagaSignalInput;
  severityScore: number;
}): StuckSagaSeverity {
  const rule = getStuckSagaRule(params.input.stuckType);

  if (!rule) return "danger";

  if (
    params.input.moneyMovementAffected &&
    params.input.moneyExposure.exposureAmount > 0 &&
    params.input.moneyExposure.unknownAmount > 0
  ) {
    return "critical";
  }

  if (
    params.input.stuckType === "saga_money_debited_no_completion" ||
    params.input.stuckType === "execution_money_mutation_uncertain" ||
    params.input.stuckType === "orphan_external_transfer"
  ) {
    return "critical";
  }

  if (params.severityScore >= rule.criticalSeverityScore) return "critical";
  if (params.severityScore >= rule.failSeverityScore) return "danger";
  if (params.severityScore >= rule.warnSeverityScore) return "warning";

  return rule.defaultSeverity;
}

function decideOutcome(params: {
  input: StuckSagaSignalInput;
  severityScore: number;
  confidenceScore: number;
  reasons: string[];
}): StuckSagaEvaluationResult["status"] {
  const rule = getStuckSagaRule(params.input.stuckType);

  if (!rule) {
    params.reasons.push("stuck_saga_no_active_rule");
    return "stuck_saga_skip";
  }

  if (params.confidenceScore < rule.minConfidenceScore) {
    params.reasons.push("stuck_saga_confidence_below_minimum");
    return "stuck_saga_skip";
  }

  if (!params.input.stuckDetected) {
    params.reasons.push("stuck_saga_not_detected");
    return "stuck_saga_pass";
  }

  if (
    params.input.moneyMovementAffected &&
    params.input.moneyExposure.exposureAmount > 0 &&
    (params.input.moneyExposure.unknownAmount > 0 ||
      params.input.providerAffected)
  ) {
    params.reasons.push("stuck_saga_money_exposure_uncertain");
    return "stuck_saga_critical";
  }

  if (params.severityScore >= rule.criticalSeverityScore) {
    params.reasons.push("stuck_saga_critical_severity");
    return "stuck_saga_critical";
  }

  if (params.severityScore >= rule.failSeverityScore) {
    params.reasons.push("stuck_saga_fail_severity");
    return "stuck_saga_fail";
  }

  if (params.severityScore >= rule.warnSeverityScore) {
    params.reasons.push("stuck_saga_warn_severity");
    return "stuck_saga_warn";
  }

  params.reasons.push("stuck_saga_warning_default");
  return "stuck_saga_warn";
}

function dbStatusFromOutcome(
  status: StuckSagaEvaluationResult["status"]
): StuckSagaResultStatus {
  if (status === "stuck_saga_pass") return "stuck_saga_passed";
  if (status === "stuck_saga_warn") return "stuck_saga_warning";
  if (status === "stuck_saga_fail") return "stuck_saga_failed";
  if (status === "stuck_saga_critical") return "stuck_saga_critical";
  return "stuck_saga_skipped";
}

function createStuckSagaEvent(params: {
  input: StuckSagaSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: eventUserId(params.input),
    coinCode: "J",
    eventType: params.eventType,
    objectType: "stuck_saga",
    objectId: eventObjectId(params.input) ?? params.input.stuckType,
    sourceContext: "stuck_saga",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      stuckType: params.input.stuckType,
      scanScope: params.input.scanScope,
      linkedObjectIds: params.input.linkedObjectIds,
      timing: params.input.timing,
      moneyExposure: params.input.moneyExposure,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateStuckSaga(
  input: StuckSagaSignalInput
): StuckSagaEvaluationResult {
  const reasons: string[] = [];
  const rule = getStuckSagaRule(input.stuckType);

  const stuckSeverityScore = calculateSeverityScore(input);
  const stuckConfidenceScore = calculateConfidenceScore(input);

  const status = decideOutcome({
    input,
    severityScore: stuckSeverityScore,
    confidenceScore: stuckConfidenceScore,
    reasons
  });

  const severity = chooseSeverity({
    input,
    severityScore: stuckSeverityScore
  });

  const passed = status === "stuck_saga_pass";
  const warning = status === "stuck_saga_warn";
  const failed = status === "stuck_saga_fail";
  const critical = status === "stuck_saga_critical";
  const skipped = status === "stuck_saga_skip";

  const shouldCreateOperationalAlert =
    Boolean(rule?.createsOperationalAlert) && (failed || critical);

  const shouldCreateReviewCase =
    Boolean(rule?.createsReviewCase) &&
    critical &&
    !input.reviewAlreadyExists;

  const verificationStatus: AlphabetEvent["verificationStatus"] = passed
    ? "verified"
    : "rejected";

  const base = {
    rawScore: stuckConfidenceScore,
    qualityScore: 1 - stuckSeverityScore,
    riskScore: stuckSeverityScore,
    verificationStatus,
    metadata: {
      status,
      severity,
      reasons
    }
  };

  const stuckSagaScanStartedEvent = createStuckSagaEvent({
    input,
    eventType: "stuck_saga_scan_started",
    ...base
  });

  const stuckSagaPassedEvent = passed
    ? createStuckSagaEvent({
        input,
        eventType: "stuck_saga_passed",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const stuckSagaWarningEvent = warning
    ? createStuckSagaEvent({
        input,
        eventType: "stuck_saga_warning",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const stuckSagaFailedEvent = failed
    ? createStuckSagaEvent({
        input,
        eventType: "stuck_saga_failed",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const stuckSagaCriticalEvent = critical
    ? createStuckSagaEvent({
        input,
        eventType: "stuck_saga_critical",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const stuckSagaScanCompletedEvent = createStuckSagaEvent({
    input,
    eventType: "stuck_saga_scan_completed",
    ...base
  });

  return {
    status,
    dbStatus: dbStatusFromOutcome(status),
    stuckType: input.stuckType,
    scanScope: input.scanScope,
    severity,
    stuckSeverityScore,
    stuckConfidenceScore,
    passed,
    warning,
    failed,
    critical,
    skipped,
    shouldCreateOperationalAlert,
    shouldCreateReviewCase,
    reasons,
    stuckSagaScanStartedEvent,
    stuckSagaPassedEvent,
    stuckSagaWarningEvent,
    stuckSagaFailedEvent,
    stuckSagaCriticalEvent,
    stuckSagaScanCompletedEvent,
    metadata: {
      ruleStuckType: rule?.stuckType ?? null,
      ...((input.metadata as Record<string, unknown>) ?? {})
    } as Json
  };
}
