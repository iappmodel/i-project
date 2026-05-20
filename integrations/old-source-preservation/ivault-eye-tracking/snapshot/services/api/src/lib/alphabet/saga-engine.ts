import { SAGA_RULES } from "../../data/alphabet/saga-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  SagaEvaluationResult,
  SagaOutcomeStatus,
  SagaRuleSet,
  SagaSignalInput,
  SagaStep,
  SagaStepType
} from "../../types/alphabet/saga.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: SagaSignalInput): SagaRuleSet | undefined {
  return SAGA_RULES.find((rule) => rule.active && rule.sagaType === input.sagaType);
}

function isTimedOut(input: SagaSignalInput): boolean {
  if (!input.timeoutDeadline) return false;
  return new Date(input.now).getTime() > new Date(input.timeoutDeadline).getTime();
}

function hasStepType(input: SagaSignalInput, stepType: SagaStepType): boolean {
  return input.steps.some((step) => step.stepType === stepType);
}

function missingRequiredStepTypes(input: SagaSignalInput, rule: SagaRuleSet): SagaStepType[] {
  return rule.requiredStepTypes.filter((stepType) => !hasStepType(input, stepType));
}

function dependenciesPassed(step: SagaStep, steps: SagaStep[]): boolean {
  return step.dependsOnStepIds.every((dependencyId) => {
    const dependency = steps.find((candidate) => candidate.sagaStepId === dependencyId);
    return dependency?.status === "passed" || dependency?.status === "skipped";
  });
}

function getNextRunnableSteps(input: SagaSignalInput): SagaStep[] {
  return input.steps.filter(
    (step) =>
      step.status === "pending" &&
      dependenciesPassed(step, input.steps) &&
      step.retryCount <= step.maxRetries
  );
}

function getFailedSteps(input: SagaSignalInput): SagaStep[] {
  return input.steps.filter((step) => step.status === "failed");
}

function getBlockedSteps(input: SagaSignalInput): SagaStep[] {
  return input.steps.filter(
    (step) => step.status === "pending" && !dependenciesPassed(step, input.steps)
  );
}

function calculateSagaProgressScore(input: SagaSignalInput, rule?: SagaRuleSet): number {
  if (input.steps.length === 0) return 0;

  const weights: Record<SagaStep["status"], number> = {
    pending: 0,
    running: 0.35,
    passed: 1,
    failed: 0,
    skipped: 0.75,
    canceled: 0,
    compensating: 0.45,
    compensated: 0.8
  };

  const base = input.steps.reduce((sum, step) => sum + weights[step.status], 0) / input.steps.length;
  const missingPenalty = rule ? missingRequiredStepTypes(input, rule).length * 0.08 : 0;
  return clamp(base - missingPenalty);
}

function calculateSagaHealthScore(input: SagaSignalInput, rule?: SagaRuleSet): number {
  const failedCount = getFailedSteps(input).length;
  const runningCount = input.steps.filter((step) => step.status === "running").length;
  const timedOut = isTimedOut(input);

  const riskAverage = clamp(
    input.riskSignals.sagaRisk * 0.2 +
      input.riskSignals.policyRisk * 0.16 +
      input.riskSignals.executionRisk * 0.18 +
      input.riskSignals.handlerRisk * 0.16 +
      input.riskSignals.auditRisk * 0.15 +
      input.riskSignals.notificationRisk * 0.15
  );

  let score = 1 - riskAverage;
  score -= failedCount * 0.12;
  score += runningCount > 0 ? 0.04 : 0;
  score -= timedOut ? 0.25 : 0;

  if (rule && missingRequiredStepTypes(input, rule).length > 0) score -= 0.15;

  return clamp(score);
}

function calculateCompensationRiskScore(input: SagaSignalInput, rule?: SagaRuleSet): number {
  let risk =
    input.riskSignals.executionRisk * 0.25 +
    input.riskSignals.handlerRisk * 0.2 +
    input.riskSignals.auditRisk * 0.15 +
    input.riskSignals.policyRisk * 0.15 +
    input.riskSignals.sagaRisk * 0.25;

  const failedCompensatableSteps = input.steps.filter(
    (step) => step.status === "failed" && step.compensationRequired
  ).length;
  risk += failedCompensatableSteps * 0.15;

  if (rule?.requiresCompensationForMoneyFailure && input.executionFailed) risk += 0.2;
  return clamp(risk);
}

function calculateCompletionConfidenceScore(input: SagaSignalInput, rule?: SagaRuleSet): number {
  const progress = calculateSagaProgressScore(input, rule);
  const health = calculateSagaHealthScore(input, rule);
  const compensationRisk = calculateCompensationRiskScore(input, rule);

  const requirementScore =
    (!rule?.requiresPolicy || input.policyPassed) &&
    (!rule?.requiresExecution || input.executionCompleted) &&
    (!rule?.requiresHandlerValidation || input.handlerValidationPassed) &&
    (!rule?.requiresAudit || input.auditCompleted) &&
    (!rule?.requiresNotification || input.notificationCompleted || rule.allowSkipNotification)
      ? 1
      : 0.45;

  return clamp(progress * 0.35 + health * 0.3 + requirementScore * 0.25 + (1 - compensationRisk) * 0.1);
}

function buildCompensationPlan(input: SagaSignalInput, rule?: SagaRuleSet): {
  required: boolean;
  actions: string[];
  reasonCodes: string[];
} {
  const actions: string[] = [];
  const reasonCodes: string[] = [];

  for (const step of input.steps) {
    if (step.status === "failed" && step.compensationRequired) {
      actions.push(step.compensationAction ?? `compensate:${step.stepType}`);
      reasonCodes.push(`failed_step_requires_compensation:${step.stepType}`);
    }
  }

  if (rule?.requiresCompensationForMoneyFailure && input.executionFailed) {
    actions.push("review_money_movement_and_reverse_if_needed");
    reasonCodes.push("money_execution_failed_requires_compensation_review");
  }

  if (input.compensationRequested) reasonCodes.push("compensation_explicitly_requested");

  return {
    required: actions.length > 0 || input.compensationRequested,
    actions,
    reasonCodes
  };
}

function decideSagaOutcome(params: {
  input: SagaSignalInput;
  rule: SagaRuleSet;
  progressScore: number;
  healthScore: number;
  compensationRiskScore: number;
  completionConfidenceScore: number;
  missingStepTypes: SagaStepType[];
  failedSteps: SagaStep[];
  nextRunnableSteps: SagaStep[];
  compensationPlan: { required: boolean; actions: string[]; reasonCodes: string[] };
  reasons: string[];
}): SagaOutcomeStatus {
  const {
    input,
    rule,
    progressScore,
    healthScore,
    compensationRiskScore,
    completionConfidenceScore,
    missingStepTypes,
    failedSteps,
    nextRunnableSteps,
    compensationPlan,
    reasons
  } = params;

  if (input.cancelRequested) {
    reasons.push("saga_canceled");
    return "saga_canceled";
  }
  if (input.compensationCompleted) {
    reasons.push("saga_compensated");
    return "saga_compensated";
  }
  if (compensationPlan.required) {
    reasons.push("saga_compensation_required");
    return "saga_compensation_required";
  }
  if (isTimedOut(input)) {
    reasons.push("saga_timeout_deadline_exceeded");
    return failedSteps.length > 0 ? "saga_failed" : "saga_requires_review";
  }
  if (missingStepTypes.length > 0) {
    reasons.push("saga_missing_required_step_types");
    return "saga_blocked";
  }
  if (input.policyFailed) {
    reasons.push("saga_policy_failed");
    return "saga_failed";
  }
  if (input.handlerValidationFailed) {
    reasons.push("saga_handler_validation_failed");
    return "saga_failed";
  }
  if (input.executionFailed) {
    reasons.push("saga_execution_failed");
    return rule.requiresCompensationForMoneyFailure ? "saga_compensation_required" : "saga_failed";
  }
  if (failedSteps.length > 0 && !rule.allowLimitedCompletion) {
    reasons.push("saga_required_step_failed");
    return "saga_failed";
  }
  if (compensationRiskScore > rule.maxCompensationRiskScore) {
    reasons.push("saga_compensation_risk_above_maximum");
    return "saga_requires_review";
  }

  const requiredComplete =
    (!rule.requiresPolicy || input.policyPassed) &&
    (!rule.requiresExecution || input.executionCompleted) &&
    (!rule.requiresHandlerValidation || input.handlerValidationPassed) &&
    (!rule.requiresAudit || input.auditCompleted) &&
    (!rule.requiresNotification || input.notificationCompleted || rule.allowSkipNotification);

  if (
    requiredComplete &&
    progressScore >= rule.minSagaProgressScore &&
    healthScore >= rule.minSagaHealthScore &&
    completionConfidenceScore >= rule.minCompletionConfidenceScore
  ) {
    reasons.push("saga_completed");
    return "saga_completed";
  }

  if (nextRunnableSteps.length > 0) {
    reasons.push("saga_ready");
    return "saga_ready";
  }

  reasons.push("saga_waiting");
  return "saga_waiting";
}

function createSagaAlphabetEvent(params: {
  input: SagaSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "saga",
    objectId: params.input.sagaId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      sagaId: params.input.sagaId,
      sagaType: params.input.sagaType,
      currentStatus: params.input.currentStatus,
      userId: params.input.userId,
      creatorId: params.input.creatorId ?? null,
      businessId: params.input.businessId ?? null,
      walletId: params.input.walletId ?? null,
      contentId: params.input.contentId ?? null,
      campaignId: params.input.campaignId ?? null,
      grantEligibilityId: params.input.grantEligibilityId ?? null,
      sourceActionIntentId: params.input.sourceActionIntentId ?? null,
      policyDecisionId: params.input.policyDecisionId ?? null,
      executionRequestIds: params.input.executionRequestIds,
      handlerDefinitionIds: params.input.handlerDefinitionIds,
      auditRecordIds: params.input.auditRecordIds,
      notificationIds: params.input.notificationIds,
      sourceEventIds: params.input.sourceEventIds,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateSaga(input: SagaSignalInput): SagaEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const progressScore = calculateSagaProgressScore(input, rule);
  const healthScore = calculateSagaHealthScore(input, rule);
  const compensationRiskScore = calculateCompensationRiskScore(input, rule);
  const completionConfidenceScore = calculateCompletionConfidenceScore(input, rule);
  const nextRunnableSteps = getNextRunnableSteps(input);
  const failedSteps = getFailedSteps(input);
  const blockedSteps = getBlockedSteps(input);
  const compensationPlan = buildCompensationPlan(input, rule);

  if (!rule) {
    reasons.push("no_active_saga_rule");

    const sagaCreatedEvent = createSagaAlphabetEvent({
      input,
      eventType: "saga_created",
      rawScore: progressScore,
      qualityScore: healthScore,
      riskScore: compensationRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      sagaId: input.sagaId,
      sagaType: input.sagaType,
      status: "saga_requires_review",
      userId: input.userId,
      creatorId: input.creatorId ?? null,
      businessId: input.businessId ?? null,
      walletId: input.walletId ?? null,
      contentId: input.contentId ?? null,
      campaignId: input.campaignId ?? null,
      grantEligibilityId: input.grantEligibilityId ?? null,
      sagaProgressScore: progressScore,
      sagaHealthScore: healthScore,
      compensationRiskScore,
      completionConfidenceScore,
      ready: false,
      waiting: false,
      blocked: false,
      requiresReview: true,
      completed: false,
      failed: false,
      canceled: false,
      compensationRequired: false,
      compensated: false,
      nextRunnableSteps,
      failedSteps,
      blockedSteps,
      finalizationOutput: null,
      compensationPlan,
      reasons,
      sagaCreatedEvent,
      sagaStartedEvent: null,
      sagaStepStartedEvent: null,
      sagaStepPassedEvent: null,
      sagaStepFailedEvent: null,
      sagaStepSkippedEvent: null,
      sagaPolicyPassedEvent: null,
      sagaPolicyFailedEvent: null,
      sagaExecutionDispatchedEvent: null,
      sagaExecutionCompletedEvent: null,
      sagaExecutionFailedEvent: null,
      sagaAuditCompletedEvent: null,
      sagaNotificationCompletedEvent: null,
      sagaCompletedEvent: null,
      sagaFailedEvent: null,
      sagaCanceledEvent: null,
      sagaCompensationRequiredEvent: null,
      sagaCompensatedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const missingStepTypes = missingRequiredStepTypes(input, rule);

  const status = decideSagaOutcome({
    input,
    rule,
    progressScore,
    healthScore,
    compensationRiskScore,
    completionConfidenceScore,
    missingStepTypes,
    failedSteps,
    nextRunnableSteps,
    compensationPlan,
    reasons
  });

  const ready = status === "saga_ready";
  const waiting = status === "saga_waiting";
  const blocked = status === "saga_blocked";
  const requiresReview = status === "saga_requires_review";
  const completed = status === "saga_completed";
  const failed = status === "saga_failed";
  const canceled = status === "saga_canceled";
  const compensationRequired = status === "saga_compensation_required";
  const compensated = status === "saga_compensated";

  const finalizationOutput =
    completed || compensated
      ? {
          sagaId: input.sagaId,
          sagaType: input.sagaType,
          status,
          completedObjectIds: {
            policyDecisionId: input.policyDecisionId ?? null,
            executionRequestIds: input.executionRequestIds,
            handlerDefinitionIds: input.handlerDefinitionIds,
            auditRecordIds: input.auditRecordIds,
            notificationIds: input.notificationIds
          }
        }
      : null;

  const verificationStatus = completed || compensated || ready || waiting ? "verified" : "rejected";

  const sagaCreatedEvent = createSagaAlphabetEvent({
    input,
    eventType: "saga_created",
    rawScore: progressScore,
    qualityScore: healthScore,
    riskScore: compensationRiskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const sagaStartedEvent =
    input.currentStatus === "saga_started"
      ? createSagaAlphabetEvent({
          input,
          eventType: "saga_started",
          rawScore: progressScore,
          qualityScore: healthScore,
          riskScore: compensationRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const runningStep = input.steps.find((step) => step.status === "running");
  const passedStep = input.steps.find((step) => step.status === "passed");
  const failedStep = input.steps.find((step) => step.status === "failed");
  const skippedStep = input.steps.find((step) => step.status === "skipped");

  const sagaStepStartedEvent = runningStep
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_step_started",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus,
        metadata: { step: runningStep, status, reasons }
      })
    : null;

  const sagaStepPassedEvent = passedStep
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_step_passed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus,
        metadata: { step: passedStep, status, reasons }
      })
    : null;

  const sagaStepFailedEvent = failedStep
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_step_failed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus: "rejected",
        metadata: { step: failedStep, status, reasons }
      })
    : null;

  const sagaStepSkippedEvent = skippedStep
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_step_skipped",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus,
        metadata: { step: skippedStep, status, reasons }
      })
    : null;

  const sagaPolicyPassedEvent = input.policyPassed
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_policy_passed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: input.riskSignals.policyRisk,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const sagaPolicyFailedEvent = input.policyFailed
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_policy_failed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: input.riskSignals.policyRisk,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const sagaExecutionDispatchedEvent = input.executionDispatched
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_execution_dispatched",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: input.riskSignals.executionRisk,
        verificationStatus,
        metadata: { status, reasons }
      })
    : null;

  const sagaExecutionCompletedEvent = input.executionCompleted
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_execution_completed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: input.riskSignals.executionRisk,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const sagaExecutionFailedEvent = input.executionFailed
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_execution_failed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: input.riskSignals.executionRisk,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const sagaAuditCompletedEvent = input.auditCompleted
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_audit_completed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: input.riskSignals.auditRisk,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const sagaNotificationCompletedEvent = input.notificationCompleted
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_notification_completed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: input.riskSignals.notificationRisk,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const sagaCompletedEvent = completed
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_completed",
        rawScore: completionConfidenceScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus: "verified",
        metadata: { status, finalizationOutput, reasons }
      })
    : null;

  const sagaFailedEvent = failed
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_failed",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const sagaCanceledEvent = canceled
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_canceled",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const sagaCompensationRequiredEvent = compensationRequired
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_compensation_required",
        rawScore: compensationRiskScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus: "rejected",
        metadata: { status, compensationPlan, reasons }
      })
    : null;

  const sagaCompensatedEvent = compensated
    ? createSagaAlphabetEvent({
        input,
        eventType: "saga_compensated",
        rawScore: progressScore,
        qualityScore: healthScore,
        riskScore: compensationRiskScore,
        verificationStatus: "verified",
        metadata: { status, compensationPlan, reasons }
      })
    : null;

  return {
    sagaId: input.sagaId,
    sagaType: input.sagaType,
    status,
    userId: input.userId,
    creatorId: input.creatorId ?? null,
    businessId: input.businessId ?? null,
    walletId: input.walletId ?? null,
    contentId: input.contentId ?? null,
    campaignId: input.campaignId ?? null,
    grantEligibilityId: input.grantEligibilityId ?? null,
    sagaProgressScore: progressScore,
    sagaHealthScore: healthScore,
    compensationRiskScore,
    completionConfidenceScore,
    ready,
    waiting,
    blocked,
    requiresReview,
    completed,
    failed,
    canceled,
    compensationRequired,
    compensated,
    nextRunnableSteps,
    failedSteps,
    blockedSteps,
    finalizationOutput,
    compensationPlan,
    reasons,
    sagaCreatedEvent,
    sagaStartedEvent,
    sagaStepStartedEvent,
    sagaStepPassedEvent,
    sagaStepFailedEvent,
    sagaStepSkippedEvent,
    sagaPolicyPassedEvent,
    sagaPolicyFailedEvent,
    sagaExecutionDispatchedEvent,
    sagaExecutionCompletedEvent,
    sagaExecutionFailedEvent,
    sagaAuditCompletedEvent,
    sagaNotificationCompletedEvent,
    sagaCompletedEvent,
    sagaFailedEvent,
    sagaCanceledEvent,
    sagaCompensationRequiredEvent,
    sagaCompensatedEvent,
    metadata: {
      ruleSagaType: rule.sagaType,
      ...input.metadata
    }
  };
}
