import {
  DANGEROUS_EXECUTION_ACTIONS,
  EXECUTION_ROUTER_RULES,
  MONEY_EXECUTION_ACTIONS,
  MUTATION_EXECUTION_ACTIONS,
  RESTRICTED_PAYLOAD_KEYS
} from "../../data/alphabet/execution-router-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  ExecutionAction,
  ExecutionOutcomeStatus,
  ExecutionRouterEvaluationResult,
  ExecutionRouterRuleSet,
  ExecutionRouterSignalInput
} from "../../types/alphabet/execution-router.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: ExecutionRouterSignalInput): ExecutionRouterRuleSet | undefined {
  return EXECUTION_ROUTER_RULES.find(
    (rule) => rule.active && rule.targetSystem === input.targetSystem
  );
}

function isMutation(action: ExecutionAction): boolean {
  return MUTATION_EXECUTION_ACTIONS.has(action);
}

function isDangerous(action: ExecutionAction): boolean {
  return DANGEROUS_EXECUTION_ACTIONS.has(action);
}

function isMoneyAction(action: ExecutionAction): boolean {
  return MONEY_EXECUTION_ACTIONS.has(action);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeExecutionPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (RESTRICTED_PAYLOAD_KEYS.has(key)) continue;

    if (isPlainRecord(value)) {
      sanitized[key] = sanitizeExecutionPayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function calculateHandlerReadinessScore(input: ExecutionRouterSignalInput): number {
  return clamp(
    (input.handlerAvailable ? 0.45 : 0) +
      (input.handlerHealthy ? 0.45 : 0) +
      (input.handlerName.trim().length > 0 ? 0.05 : 0) +
      (input.handlerVersion.trim().length > 0 ? 0.05 : 0)
  );
}

function calculatePayloadSafetyScore(input: ExecutionRouterSignalInput): number {
  let score = 1;

  if (input.containsRestrictedPayloadKeys) score -= 0.25;
  if (input.containsPaymentData) score -= 0.12;
  if (input.containsPrivateUserData) score -= 0.1;
  if (input.containsRawRiskData) score -= 0.18;

  if (JSON.stringify(input.sanitizedPayload).length > 20_000) score -= 0.08;

  return clamp(score);
}

function calculateRetrySafetyScore(
  input: ExecutionRouterSignalInput,
  rule?: ExecutionRouterRuleSet
): number {
  const maxRetries = rule?.maxRetries ?? input.maxRetries;

  if (input.retryCount <= 0) return 1;
  if (input.retryCount >= maxRetries) return 0;

  return clamp(1 - input.retryCount / Math.max(1, maxRetries));
}

function calculateExecutionRiskScore(input: ExecutionRouterSignalInput): number {
  let risk =
    clamp(input.riskScore) * 0.22 +
    clamp(input.paymentRisk) * 0.18 +
    clamp(input.privacyRisk) * 0.16 +
    clamp(input.complianceRisk) * 0.22 +
    clamp(input.handlerRisk) * 0.12;

  if (isDangerous(input.action)) risk += 0.1;
  if (isMoneyAction(input.action)) risk += 0.08;
  if (input.duplicateRequestCount > 0) risk += Math.min(0.1, input.duplicateRequestCount * 0.03);
  if (input.retryCount > 0) risk += Math.min(0.08, input.retryCount * 0.03);

  return clamp(risk);
}

function calculateDispatchSafetyScore(
  input: ExecutionRouterSignalInput,
  rule?: ExecutionRouterRuleSet
): number {
  const handlerReadinessScore = calculateHandlerReadinessScore(input);
  const payloadSafetyScore = calculatePayloadSafetyScore(input);
  const retrySafetyScore = calculateRetrySafetyScore(input, rule);
  const executionRiskScore = calculateExecutionRiskScore(input);

  const policyScore =
    input.policyDecision === "allow"
      ? 1
      : input.policyDecision === "allow_with_limits"
        ? 0.72
        : input.policyDecision === "hold"
          ? 0.35
          : input.policyDecision.startsWith("require_")
            ? 0.25
            : 0;

  return clamp(
    policyScore * 0.3 +
      handlerReadinessScore * 0.22 +
      payloadSafetyScore * 0.22 +
      retrySafetyScore * 0.11 +
      (1 - executionRiskScore) * 0.15
  );
}

function decideExecutionOutcome(params: {
  input: ExecutionRouterSignalInput;
  rule: ExecutionRouterRuleSet;
  dispatchSafetyScore: number;
  handlerReadinessScore: number;
  payloadSafetyScore: number;
  retrySafetyScore: number;
  executionRiskScore: number;
  reasons: string[];
}): ExecutionOutcomeStatus {
  const {
    input,
    rule,
    dispatchSafetyScore,
    handlerReadinessScore,
    payloadSafetyScore,
    retrySafetyScore,
    executionRiskScore,
    reasons
  } = params;

  if (input.cancelRequested) {
    reasons.push("execution_canceled");
    return "execution_canceled";
  }

  if (!rule.allowedActions.includes(input.action)) {
    reasons.push("execution_action_not_allowed_for_target_system");
    return "execution_denied";
  }

  if (input.duplicateRequestCount > 0 && input.dedupeKey) {
    reasons.push("duplicate_execution_request_detected");
    return "execution_denied";
  }

  if (
    rule.requiresIdempotency &&
    (isMoneyAction(input.action) || isMutation(input.action)) &&
    !input.idempotencyKey
  ) {
    reasons.push("idempotency_key_required");
    return "execution_denied";
  }

  if (
    isMutation(input.action) &&
    !rule.allowMutationWithoutPolicyAllow &&
    input.policyDecision !== "allow" &&
    input.policyDecision !== "allow_with_limits"
  ) {
    reasons.push("mutation_not_allowed_without_policy_allow");
    return "execution_denied";
  }

  if (
    (input.policyDecision === "block" ||
      input.policyDecision === "escalate" ||
      input.policyDecision === "require_review" ||
      input.policyDecision === "require_verification") &&
    isMutation(input.action)
  ) {
    reasons.push("policy_state_blocks_mutation_execution");
    return "execution_denied";
  }

  if (handlerReadinessScore < rule.minHandlerReadinessScore) {
    reasons.push("handler_readiness_below_minimum");
    return "execution_requires_review";
  }

  if (payloadSafetyScore < rule.minPayloadSafetyScore) {
    reasons.push("payload_safety_below_minimum");
    return "execution_requires_review";
  }

  if (retrySafetyScore < rule.minRetrySafetyScore) {
    reasons.push("retry_safety_below_minimum");
    return "execution_failed";
  }

  if (executionRiskScore > rule.maxExecutionRiskScore) {
    reasons.push("execution_risk_above_maximum");
    return executionRiskScore > 0.65 ? "execution_denied" : "execution_requires_review";
  }

  if (dispatchSafetyScore < rule.minDispatchSafetyScore) {
    reasons.push("dispatch_safety_below_minimum");
    return "execution_requires_review";
  }

  if (rule.requiresAuditForDangerousActions && isDangerous(input.action) && !input.auditCreated) {
    reasons.push("audit_required_for_dangerous_execution");
    return "execution_requires_review";
  }

  if (input.executionFailed) {
    reasons.push("handler_execution_failed");
    return "execution_failed";
  }

  if (input.executionSucceeded) {
    reasons.push("execution_completed");
    return "execution_completed";
  }

  if (input.dispatchRequested) {
    reasons.push("execution_dispatched");
    return "execution_dispatched";
  }

  reasons.push("execution_allowed");
  return "execution_allowed";
}

function createExecutionAlphabetEvent(params: {
  input: ExecutionRouterSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: "system",
    coinCode: "J",
    eventType: params.eventType,
    objectType: "execution_request",
    objectId: params.input.executionRequestId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      executionRequestId: params.input.executionRequestId,
      sourcePolicyDecisionId: params.input.sourcePolicyDecisionId ?? null,
      sourceEventIds: params.input.sourceEventIds,
      targetSystem: params.input.targetSystem,
      targetObjectId: params.input.targetObjectId ?? null,
      action: params.input.action,
      priority: params.input.priority,
      idempotencyKey: params.input.idempotencyKey ?? null,
      dedupeKey: params.input.dedupeKey ?? null,
      handlerName: params.input.handlerName,
      handlerVersion: params.input.handlerVersion,
      retryCount: params.input.retryCount,
      maxRetries: params.input.maxRetries,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateExecutionRequest(
  input: ExecutionRouterSignalInput
): ExecutionRouterEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const handlerReadinessScore = calculateHandlerReadinessScore(input);
  const payloadSafetyScore = calculatePayloadSafetyScore(input);
  const retrySafetyScore = calculateRetrySafetyScore(input, rule);
  const executionRiskScore = calculateExecutionRiskScore(input);
  const dispatchSafetyScore = calculateDispatchSafetyScore(input, rule);

  const safePayload = sanitizeExecutionPayload(input.sanitizedPayload);

  if (!rule) {
    reasons.push("no_active_execution_router_rule");

    const executionRequestCreatedEvent = createExecutionAlphabetEvent({
      input,
      eventType: "execution_request_created",
      rawScore: dispatchSafetyScore,
      qualityScore: handlerReadinessScore,
      riskScore: executionRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      executionRequestId: input.executionRequestId,
      sourcePolicyDecisionId: input.sourcePolicyDecisionId ?? null,
      sourceEventIds: input.sourceEventIds,
      targetSystem: input.targetSystem,
      targetObjectId: input.targetObjectId ?? null,
      action: input.action,
      status: "execution_denied",
      dispatchSafetyScore,
      handlerReadinessScore,
      payloadSafetyScore,
      retrySafetyScore,
      executionRiskScore,
      queued: false,
      dispatchAllowed: false,
      dispatchDenied: true,
      requiresReview: false,
      dispatched: false,
      completed: false,
      failed: false,
      canceled: false,
      sanitizedPayload: safePayload,
      resultPayload: input.resultPayload ?? null,
      handlerRoute: {
        targetSystem: input.targetSystem,
        handlerName: input.handlerName,
        handlerVersion: input.handlerVersion,
        action: input.action
      },
      auditRequired: false,
      notificationRecommended: true,
      reasons,
      executionRequestCreatedEvent,
      executionQueuedEvent: null,
      executionAllowedEvent: null,
      executionDeniedEvent: executionRequestCreatedEvent,
      executionRequiresReviewEvent: null,
      executionDispatchedEvent: null,
      executionCompletedEvent: null,
      executionFailedEvent: null,
      executionCanceledEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideExecutionOutcome({
    input,
    rule,
    dispatchSafetyScore,
    handlerReadinessScore,
    payloadSafetyScore,
    retrySafetyScore,
    executionRiskScore,
    reasons
  });

  const queued = status === "execution_queued";
  const dispatchAllowed =
    status === "execution_allowed" ||
    status === "execution_dispatched" ||
    status === "execution_completed";
  const dispatchDenied = status === "execution_denied";
  const requiresReview = status === "execution_requires_review";
  const dispatched = status === "execution_dispatched" || status === "execution_completed";
  const completed = status === "execution_completed";
  const failed = status === "execution_failed";
  const canceled = status === "execution_canceled";

  const auditRequired =
    rule.requiresAuditForDangerousActions &&
    isDangerous(input.action);

  const notificationRecommended =
    dispatchDenied ||
    requiresReview ||
    failed ||
    canceled ||
    completed;

  const verificationStatus =
    dispatchAllowed || completed ? "verified" : "rejected";

  const executionRequestCreatedEvent = createExecutionAlphabetEvent({
    input,
    eventType: "execution_request_created",
    rawScore: dispatchSafetyScore,
    qualityScore: handlerReadinessScore,
    riskScore: executionRiskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const executionQueuedEvent =
    queued
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_queued",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const executionAllowedEvent =
    status === "execution_allowed"
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_allowed",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const executionDeniedEvent =
    dispatchDenied
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_denied",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const executionRequiresReviewEvent =
    requiresReview
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_requires_review",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const executionDispatchedEvent =
    status === "execution_dispatched"
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_dispatched",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            handlerRoute: {
              targetSystem: input.targetSystem,
              handlerName: input.handlerName,
              handlerVersion: input.handlerVersion,
              action: input.action
            },
            reasons
          }
        })
      : null;

  const executionCompletedEvent =
    completed
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_completed",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            resultPayload: input.resultPayload ?? null,
            reasons
          }
        })
      : null;

  const executionFailedEvent =
    failed
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_failed",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            resultPayload: input.resultPayload ?? null,
            reasons
          }
        })
      : null;

  const executionCanceledEvent =
    canceled
      ? createExecutionAlphabetEvent({
          input,
          eventType: "execution_canceled",
          rawScore: dispatchSafetyScore,
          qualityScore: handlerReadinessScore,
          riskScore: executionRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  return {
    executionRequestId: input.executionRequestId,
    sourcePolicyDecisionId: input.sourcePolicyDecisionId ?? null,
    sourceEventIds: input.sourceEventIds,
    targetSystem: input.targetSystem,
    targetObjectId: input.targetObjectId ?? null,
    action: input.action,
    status,
    dispatchSafetyScore,
    handlerReadinessScore,
    payloadSafetyScore,
    retrySafetyScore,
    executionRiskScore,
    queued,
    dispatchAllowed,
    dispatchDenied,
    requiresReview,
    dispatched,
    completed,
    failed,
    canceled,
    sanitizedPayload: safePayload,
    resultPayload: input.resultPayload ?? null,
    handlerRoute: {
      targetSystem: input.targetSystem,
      handlerName: input.handlerName,
      handlerVersion: input.handlerVersion,
      action: input.action
    },
    auditRequired,
    notificationRecommended,
    reasons,
    executionRequestCreatedEvent,
    executionQueuedEvent,
    executionAllowedEvent,
    executionDeniedEvent,
    executionRequiresReviewEvent,
    executionDispatchedEvent,
    executionCompletedEvent,
    executionFailedEvent,
    executionCanceledEvent,
    metadata: {
      ruleTargetSystem: rule.targetSystem,
      ...input.metadata
    }
  };
}
