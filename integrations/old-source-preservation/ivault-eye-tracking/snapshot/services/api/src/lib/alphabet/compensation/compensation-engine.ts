import { getCompensationRule } from "@/data/alphabet/compensation-rules";
import type { CoinCode } from "@/types/alphabet/coin.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  CompensationEvaluationResult,
  CompensationOutcomeStatus,
  CompensationRuleSet,
  CompensationSignalInput
} from "@/types/alphabet/compensation.types";
import type { Json } from "@/types/alphabet/database.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function calculateCompensationReadinessScore(
  input: CompensationSignalInput,
  rule?: CompensationRuleSet | null
): number {
  let score = 0;

  score += input.originalUserId ? 0.1 : 0;
  score += input.amount > 0 ? 0.1 : 0;
  score += input.coinCode ? 0.08 : 0;
  score += input.reversalDirection ? 0.08 : 0;
  score += input.sourceEventIds.length > 0 ? 0.06 : 0;
  score += input.reasonCodes.length > 0 ? 0.06 : 0;

  if (rule?.requiresOriginalLedgerEntry) {
    score += input.originalLedgerEntryId ? 0.14 : 0;
  } else {
    score += 0.08;
  }

  if (rule?.requiresIdempotency) {
    score += input.idempotencyKey ? 0.12 : 0;
  } else {
    score += 0.06;
  }

  if (rule?.requiresDedupe) {
    score += input.dedupeKey ? 0.1 : 0;
  } else {
    score += 0.05;
  }

  if (rule?.requiresAdminActor) {
    score += input.actorUserId ? 0.12 : 0;
  } else {
    score += 0.06;
  }

  score += input.safetyScores.originalMutationConfidence * 0.08;
  score += input.safetyScores.reversalEligibilityScore * 0.08;

  return clamp(score);
}

function calculateCompensationSafetyScore(input: CompensationSignalInput): number {
  let score = 1;

  score -= input.safetyScores.compensationFraudRisk * 0.3;
  score -= input.externalTransferMayHaveStarted && !input.externalTransferConfirmedFailed ? 0.35 : 0;
  score -= input.alreadyReversedAmount > 0 ? 0.12 : 0;
  score -= input.amount > input.originalAmount - input.alreadyReversedAmount ? 0.45 : 0;
  score -= input.existingReversalLedgerEntryIds.length > 0 ? 0.25 : 0;

  score += input.safetyScores.reversalSafetyScore * 0.15;
  score += input.safetyScores.compensationAuditScore * 0.1;

  return clamp(score);
}

function maxReversibleAmount(input: CompensationSignalInput): number {
  return Math.max(0, input.originalAmount - input.alreadyReversedAmount);
}

function decideCompensationOutcome(params: {
  input: CompensationSignalInput;
  rule: CompensationRuleSet;
  readinessScore: number;
  safetyScore: number;
  maxReversibleAmount: number;
  reasons: string[];
}): CompensationOutcomeStatus {
  const { input, rule, readinessScore, safetyScore, maxReversibleAmount, reasons } = params;

  if (input.cancelRequested) {
    reasons.push("compensation_canceled");
    return "compensation_canceled";
  }

  if (input.triggerType === "duplicate_detected_after_mutation" && !input.reviewApproved) {
    reasons.push("compensation_duplicate_after_mutation");
    return "compensation_requires_review";
  }

  if (rule.requiresAdminActor && !input.actorUserId) {
    reasons.push("compensation_admin_actor_required");
    return "compensation_requires_review";
  }

  if (rule.requiresOriginalLedgerEntry && !input.originalLedgerEntryId) {
    reasons.push("compensation_original_ledger_entry_required");
    return "compensation_blocked";
  }

  if (rule.requiresIdempotency && !input.idempotencyKey) {
    reasons.push("compensation_idempotency_key_required");
    return "compensation_blocked";
  }

  if (rule.requiresDedupe && !input.dedupeKey) {
    reasons.push("compensation_dedupe_key_required");
    return "compensation_blocked";
  }

  if (input.amount <= 0) {
    reasons.push("compensation_positive_amount_required");
    return "compensation_blocked";
  }

  if (input.amount > maxReversibleAmount) {
    reasons.push("compensation_amount_exceeds_reversible_amount");
    return "compensation_blocked";
  }

  if (input.existingReversalLedgerEntryIds.length > 0) {
    reasons.push("compensation_existing_reversal_detected");
    return "compensation_requires_review";
  }

  if (input.externalTransferMayHaveStarted && !input.externalTransferConfirmedFailed) {
    reasons.push("compensation_external_transfer_state_unknown");
    return "compensation_requires_review";
  }

  if (input.requiresReview && !input.reviewApproved) {
    reasons.push("compensation_review_required");
    return "compensation_requires_review";
  }

  if (input.safetyScores.originalMutationConfidence < rule.minOriginalMutationConfidence) {
    reasons.push("compensation_original_mutation_confidence_below_minimum");
    return "compensation_requires_review";
  }

  if (input.safetyScores.reversalEligibilityScore < rule.minReversalEligibilityScore) {
    reasons.push("compensation_reversal_eligibility_below_minimum");
    return "compensation_requires_review";
  }

  if (input.safetyScores.reversalSafetyScore < rule.minReversalSafetyScore) {
    reasons.push("compensation_reversal_safety_below_minimum");
    return "compensation_requires_review";
  }

  if (input.safetyScores.compensationFraudRisk > rule.maxFraudRisk) {
    reasons.push("compensation_fraud_risk_above_maximum");
    return "compensation_requires_review";
  }

  if (readinessScore < rule.minCompensationReadinessScore) {
    reasons.push("compensation_readiness_below_minimum");
    return "compensation_blocked";
  }

  if (safetyScore < rule.minCompensationSafetyScore) {
    reasons.push("compensation_safety_below_minimum");
    return "compensation_requires_review";
  }

  if (!rule.automaticExecutionAllowed && !input.reviewApproved) {
    reasons.push("compensation_manual_review_required_before_execution");
    return "compensation_requires_review";
  }

  if (input.currentStatus === "compensation_completed") {
    reasons.push("compensation_already_completed");
    return "compensation_completed";
  }

  if (input.currentStatus === "compensation_failed") {
    reasons.push("compensation_already_failed");
    return "compensation_failed";
  }

  reasons.push("compensation_execute_reversal");
  return "compensation_execute_reversal";
}

function createCompensationEvent(params: {
  input: CompensationSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  const coin = params.input.coinCode as CoinCode;
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.originalUserId,
    coinCode: coin,
    eventType: params.eventType,
    objectType: "compensation",
    objectId: params.input.compensationId,
    sourceContext: "compensation_engine",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      compensationId: params.input.compensationId,
      compensationType: params.input.compensationType,
      triggerType: params.input.triggerType,
      originalLedgerEntryId: params.input.originalLedgerEntryId ?? null,
      originalExecutionRequestId: params.input.originalExecutionRequestId ?? null,
      originalPipelineId: params.input.originalPipelineId ?? null,
      originalSagaId: params.input.originalSagaId ?? null,
      amount: params.input.amount,
      coinCode: params.input.coinCode,
      reasonCodes: params.input.reasonCodes,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

function mergeMetadata(
  base: Json | undefined,
  extra: Record<string, unknown>
): Json {
  const b = (base && typeof base === "object" && !Array.isArray(base) ? base : {}) as Record<
    string,
    unknown
  >;
  return { ...b, ...extra } as Json;
}

export function evaluateCompensation(input: CompensationSignalInput): CompensationEvaluationResult {
  const reasons: string[] = [];
  const rule = getCompensationRule(input.compensationType);

  const readinessScore = calculateCompensationReadinessScore(input, rule);
  const safetyScore = calculateCompensationSafetyScore(input);
  const reversibleAmount = maxReversibleAmount(input);

  if (!rule) {
    reasons.push("no_active_compensation_rule");

    const compensationCreatedEvent = createCompensationEvent({
      input,
      eventType: "compensation_created",
      rawScore: readinessScore,
      qualityScore: safetyScore,
      riskScore: 1 - safetyScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      compensationId: input.compensationId,
      compensationType: input.compensationType,
      triggerType: input.triggerType,
      status: "compensation_failed",
      originalUserId: input.originalUserId,
      originalLedgerEntryId: input.originalLedgerEntryId ?? null,
      originalExecutionRequestId: input.originalExecutionRequestId ?? null,
      originalPipelineId: input.originalPipelineId ?? null,
      originalSagaId: input.originalSagaId ?? null,
      compensationReadinessScore: readinessScore,
      compensationSafetyScore: safetyScore,
      ready: false,
      blocked: false,
      requiresReview: false,
      executeReversal: false,
      completed: false,
      failed: true,
      canceled: false,
      reversalAmount: input.amount,
      reversalDirection: input.reversalDirection,
      maxReversibleAmount: reversibleAmount,
      auditRequired: true,
      notificationRequired: true,
      reasons,
      compensationCreatedEvent,
      compensationValidatingEvent: null,
      compensationBlockedEvent: null,
      compensationReadyEvent: null,
      compensationReversalExecutedEvent: null,
      compensationCompletedEvent: null,
      compensationFailedEvent: compensationCreatedEvent,
      compensationRequiresReviewEvent: null,
      compensationCanceledEvent: null,
      metadata: mergeMetadata(input.metadata, { reasons })
    };
  }

  const status = decideCompensationOutcome({
    input,
    rule,
    readinessScore,
    safetyScore,
    maxReversibleAmount: reversibleAmount,
    reasons
  });

  const ready = status === "compensation_ready";
  const blocked = status === "compensation_blocked";
  const requiresReview = status === "compensation_requires_review";
  const executeReversal = status === "compensation_execute_reversal";
  const completed = status === "compensation_completed";
  const failed = status === "compensation_failed";
  const canceled = status === "compensation_canceled";

  const verificationStatus =
    executeReversal || completed || ready ? "verified" : "rejected";

  const compensationCreatedEvent = createCompensationEvent({
    input,
    eventType: "compensation_created",
    rawScore: readinessScore,
    qualityScore: safetyScore,
    riskScore: 1 - safetyScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const compensationValidatingEvent = createCompensationEvent({
    input,
    eventType: "compensation_validating",
    rawScore: readinessScore,
    qualityScore: safetyScore,
    riskScore: 1 - safetyScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const compensationBlockedEvent = blocked
    ? createCompensationEvent({
        input,
        eventType: "compensation_blocked",
        rawScore: readinessScore,
        qualityScore: safetyScore,
        riskScore: 1 - safetyScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const compensationReadyEvent =
    ready || executeReversal
      ? createCompensationEvent({
          input,
          eventType: "compensation_ready",
          rawScore: readinessScore,
          qualityScore: safetyScore,
          riskScore: 1 - safetyScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const compensationReversalExecutedEvent = executeReversal
    ? createCompensationEvent({
        input,
        eventType: "compensation_reversal_executed",
        rawScore: readinessScore,
        qualityScore: safetyScore,
        riskScore: 1 - safetyScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const compensationCompletedEvent = completed
    ? createCompensationEvent({
        input,
        eventType: "compensation_completed",
        rawScore: readinessScore,
        qualityScore: safetyScore,
        riskScore: 1 - safetyScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const compensationFailedEvent = failed
    ? createCompensationEvent({
        input,
        eventType: "compensation_failed",
        rawScore: readinessScore,
        qualityScore: safetyScore,
        riskScore: 1 - safetyScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const compensationRequiresReviewEvent = requiresReview
    ? createCompensationEvent({
        input,
        eventType: "compensation_requires_review",
        rawScore: readinessScore,
        qualityScore: safetyScore,
        riskScore: 1 - safetyScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const compensationCanceledEvent = canceled
    ? createCompensationEvent({
        input,
        eventType: "compensation_canceled",
        rawScore: readinessScore,
        qualityScore: safetyScore,
        riskScore: 1 - safetyScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  return {
    compensationId: input.compensationId,
    compensationType: input.compensationType,
    triggerType: input.triggerType,
    status,
    originalUserId: input.originalUserId,
    originalLedgerEntryId: input.originalLedgerEntryId ?? null,
    originalExecutionRequestId: input.originalExecutionRequestId ?? null,
    originalPipelineId: input.originalPipelineId ?? null,
    originalSagaId: input.originalSagaId ?? null,
    compensationReadinessScore: readinessScore,
    compensationSafetyScore: safetyScore,
    ready,
    blocked,
    requiresReview,
    executeReversal,
    completed,
    failed,
    canceled,
    reversalAmount: input.amount,
    reversalDirection: input.reversalDirection,
    maxReversibleAmount: reversibleAmount,
    auditRequired: rule.requiresAudit,
    notificationRequired: rule.requiresNotification,
    reasons,
    compensationCreatedEvent,
    compensationValidatingEvent,
    compensationBlockedEvent,
    compensationReadyEvent,
    compensationReversalExecutedEvent,
    compensationCompletedEvent,
    compensationFailedEvent,
    compensationRequiresReviewEvent,
    compensationCanceledEvent,
    metadata: mergeMetadata(input.metadata, {
      ruleCompensationType: rule.compensationType
    })
  };
}
