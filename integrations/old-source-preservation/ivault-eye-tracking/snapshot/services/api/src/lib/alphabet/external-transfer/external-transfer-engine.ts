import { getExternalTransferRule } from "@/data/alphabet/external-transfer-rules";
import type { CoinCode } from "@/types/alphabet/coin.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  ExternalTransferEvaluationResult,
  ExternalTransferOutcomeStatus,
  ExternalTransferRuleSet,
  ExternalTransferSignalInput
} from "@/types/alphabet/external-transfer.types";

const COIN_CODES: ReadonlySet<string> = new Set([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z"
]);

function parseCoinCode(code: string): CoinCode | null {
  return COIN_CODES.has(code) ? (code as CoinCode) : null;
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function calculateTransferReadinessScore(
  input: ExternalTransferSignalInput,
  rule?: ExternalTransferRuleSet | null
): number {
  let score = 0;

  score += input.userId ? 0.1 : 0;
  score += input.amount > 0 ? 0.1 : 0;
  score += input.coinCode ? 0.07 : 0;
  score += input.destinationType ? 0.08 : 0;
  score += input.destinationLabel ? 0.06 : 0;
  score += input.sourceEventIds.length > 0 ? 0.05 : 0;

  if (rule?.requiresOriginalLedgerEntry) {
    score += input.originalLedgerEntryId ? 0.12 : 0;
  } else {
    score += 0.06;
  }

  if (rule?.requiresInternalDebit) {
    score += input.internalDebitExists ? 0.12 : 0;
  } else {
    score += 0.06;
  }

  if (rule?.requiresIdempotency) {
    score += input.idempotencyKey ? 0.1 : 0;
  } else {
    score += 0.05;
  }

  if (rule?.requiresDedupe) {
    score += input.dedupeKey ? 0.08 : 0;
  } else {
    score += 0.04;
  }

  score += input.riskScores.transferEligibilityScore * 0.08;
  score += input.riskScores.destinationConfidenceScore * 0.08;
  score += input.riskScores.providerReadinessScore * 0.08;
  score += input.riskScores.complianceScore * 0.08;

  return clamp(score);
}

function calculateTransferSafetyScore(input: ExternalTransferSignalInput): number {
  let score = 1;

  score -= input.riskScores.transferFraudRisk * 0.35;
  score -= input.providerUnknown ? 0.35 : 0;
  score -= input.providerFailed && !input.internalDebitExists ? 0.15 : 0;
  score -= input.providerSucceeded && !input.providerTransferId ? 0.25 : 0;
  score -= input.compensationAlreadyCreated ? 0.1 : 0;

  score += input.riskScores.reversalSafetyScore * 0.12;
  score += input.riskScores.complianceScore * 0.12;

  return clamp(score);
}

function decideTransferOutcome(params: {
  input: ExternalTransferSignalInput;
  rule: ExternalTransferRuleSet;
  readinessScore: number;
  safetyScore: number;
  reasons: string[];
}): ExternalTransferOutcomeStatus {
  const { input, rule, readinessScore, safetyScore, reasons } = params;

  if (input.cancelRequested || input.providerCanceled) {
    reasons.push("external_transfer_canceled");
    return "transfer_failed";
  }

  if (rule.requiresOriginalLedgerEntry && !input.originalLedgerEntryId) {
    reasons.push("external_transfer_original_ledger_required");
    return "transfer_blocked";
  }

  if (rule.requiresInternalDebit && !input.internalDebitExists) {
    reasons.push("external_transfer_internal_debit_required");
    return "transfer_blocked";
  }

  if (rule.requiresIdempotency && !input.idempotencyKey) {
    reasons.push("external_transfer_idempotency_required");
    return "transfer_blocked";
  }

  if (rule.requiresDedupe && !input.dedupeKey) {
    reasons.push("external_transfer_dedupe_required");
    return "transfer_blocked";
  }

  if (input.amount <= 0) {
    reasons.push("external_transfer_positive_amount_required");
    return "transfer_blocked";
  }

  if (!input.destinationType || !input.destinationLabel) {
    reasons.push("external_transfer_destination_required");
    return "transfer_requires_review";
  }

  if (input.riskScores.transferFraudRisk > rule.maxFraudRisk) {
    reasons.push("external_transfer_fraud_risk_above_maximum");
    return "transfer_requires_review";
  }

  if (input.riskScores.transferEligibilityScore < rule.minTransferEligibilityScore) {
    reasons.push("external_transfer_eligibility_below_minimum");
    return "transfer_requires_review";
  }

  if (input.riskScores.destinationConfidenceScore < rule.minDestinationConfidenceScore) {
    reasons.push("external_transfer_destination_confidence_below_minimum");
    return "transfer_requires_review";
  }

  if (input.riskScores.providerReadinessScore < rule.minProviderReadinessScore) {
    reasons.push("external_transfer_provider_readiness_below_minimum");
    return "transfer_requires_review";
  }

  if (input.riskScores.complianceScore < rule.minComplianceScore) {
    reasons.push("external_transfer_compliance_below_minimum");
    return "transfer_requires_review";
  }

  if (readinessScore < rule.minTransferReadinessScore) {
    reasons.push("external_transfer_readiness_below_minimum");
    return "transfer_blocked";
  }

  // Unknown provider outcome must classify explicitly before generic safety gate:
  // safety score intentionally penalizes unknown, which would otherwise mask
  // transfer_unknown with transfer_requires_review (double-pay risk handling).
  if (input.providerUnknown) {
    reasons.push("external_transfer_provider_state_unknown");
    return "transfer_unknown";
  }

  if (safetyScore < rule.minTransferSafetyScore) {
    reasons.push("external_transfer_safety_below_minimum");
    return "transfer_requires_review";
  }

  if (input.providerFailed) {
    if (
      rule.compensationAllowedOnConfirmedFailure &&
      input.internalDebitExists &&
      !input.compensationAlreadyCreated
    ) {
      reasons.push("external_transfer_confirmed_failure_compensation_required");
      return "transfer_compensation_required";
    }

    reasons.push("external_transfer_provider_failed");
    return "transfer_failed";
  }

  if (input.providerSucceeded) {
    if (rule.requiresProviderTransferIdForCompletion && !input.providerTransferId) {
      reasons.push("external_transfer_provider_transfer_id_required_for_completion");
      return "transfer_requires_review";
    }

    reasons.push("external_transfer_completed");
    return "transfer_completed";
  }

  if (input.providerPending) {
    reasons.push("external_transfer_provider_pending");
    return "transfer_provider_pending";
  }

  if (input.providerRequestSent) {
    reasons.push("external_transfer_provider_request_sent_pending");
    return "transfer_provider_pending";
  }

  if (input.providerRequestCreated) {
    if (!rule.automaticProviderSendAllowed && !input.reviewApproved) {
      reasons.push("external_transfer_review_required_before_provider_send");
      return "transfer_requires_review";
    }

    reasons.push("external_transfer_send_to_provider");
    return "transfer_send_to_provider";
  }

  reasons.push("external_transfer_ready");
  return "transfer_ready";
}

function createExternalTransferEvent(params: {
  input: ExternalTransferSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  const coinCode = parseCoinCode(params.input.coinCode);
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode,
    eventType: params.eventType,
    objectType: "external_transfer",
    objectId: params.input.externalTransferId,
    sourceContext: "external_transfer",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      externalTransferId: params.input.externalTransferId,
      transferType: params.input.transferType,
      provider: params.input.provider,
      providerTransferId: params.input.providerTransferId ?? null,
      providerStatus: params.input.providerStatus ?? null,
      amount: params.input.amount,
      coinCode: params.input.coinCode,
      originalLedgerEntryId: params.input.originalLedgerEntryId ?? null,
      originalExecutionRequestId: params.input.originalExecutionRequestId ?? null,
      pipelineId: params.input.pipelineId ?? null,
      sagaId: params.input.sagaId ?? null,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateExternalTransfer(
  input: ExternalTransferSignalInput
): ExternalTransferEvaluationResult {
  const reasons: string[] = [];
  const rule = getExternalTransferRule(input.transferType);

  const readinessScore = calculateTransferReadinessScore(input, rule);
  const safetyScore = calculateTransferSafetyScore(input);
  const coinCode = parseCoinCode(input.coinCode);

  if (!rule) {
    reasons.push("no_active_external_transfer_rule");

    const externalTransferCreatedEvent = createExternalTransferEvent({
      input,
      eventType: "external_transfer_created",
      rawScore: readinessScore,
      qualityScore: safetyScore,
      riskScore: 1 - safetyScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      externalTransferId: input.externalTransferId,
      transferType: input.transferType,
      provider: input.provider,
      status: "transfer_failed",
      userId: input.userId,
      walletId: input.walletId ?? null,
      originalLedgerEntryId: input.originalLedgerEntryId ?? null,
      originalExecutionRequestId: input.originalExecutionRequestId ?? null,
      pipelineId: input.pipelineId ?? null,
      sagaId: input.sagaId ?? null,
      coinCode,
      transferReadinessScore: readinessScore,
      transferSafetyScore: safetyScore,
      ready: false,
      blocked: false,
      requiresReview: false,
      sendToProvider: false,
      providerPending: false,
      completed: false,
      failed: true,
      compensationRequired: false,
      unknown: false,
      compensationSafeToCreate: false,
      reasons,
      externalTransferCreatedEvent,
      externalTransferValidatingEvent: null,
      externalTransferBlockedEvent: null,
      externalTransferReadyEvent: null,
      externalTransferProviderRequestCreatedEvent: null,
      externalTransferProviderRequestSentEvent: null,
      externalTransferProviderPendingEvent: null,
      externalTransferProviderSucceededEvent: null,
      externalTransferProviderFailedEvent: null,
      externalTransferProviderUnknownEvent: null,
      externalTransferCompensationRequiredEvent: null,
      externalTransferCompletedEvent: null,
      externalTransferFailedEvent: externalTransferCreatedEvent,
      externalTransferRequiresReviewEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideTransferOutcome({
    input,
    rule,
    readinessScore,
    safetyScore,
    reasons
  });

  const ready = status === "transfer_ready";
  const blocked = status === "transfer_blocked";
  const requiresReview = status === "transfer_requires_review";
  const sendToProvider = status === "transfer_send_to_provider";
  const providerPending = status === "transfer_provider_pending";
  const completed = status === "transfer_completed";
  const failed = status === "transfer_failed";
  const compensationRequired = status === "transfer_compensation_required";
  const unknown = status === "transfer_unknown";

  const verificationStatus: AlphabetEvent["verificationStatus"] =
    ready || sendToProvider || providerPending || completed || compensationRequired
      ? "verified"
      : "rejected";

  const compensationSafeToCreate =
    compensationRequired &&
    input.providerFailed &&
    input.internalDebitExists &&
    !input.compensationAlreadyCreated &&
    !input.providerUnknown;

  const base = {
    rawScore: readinessScore,
    qualityScore: safetyScore,
    riskScore: 1 - safetyScore,
    verificationStatus,
    metadata: { status, reasons }
  };

  const externalTransferCreatedEvent = createExternalTransferEvent({
    input,
    eventType: "external_transfer_created",
    ...base
  });

  const externalTransferValidatingEvent = createExternalTransferEvent({
    input,
    eventType: "external_transfer_validating",
    ...base
  });

  const externalTransferBlockedEvent = blocked
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_blocked",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const externalTransferReadyEvent =
    ready || sendToProvider
      ? createExternalTransferEvent({
          input,
          eventType: "external_transfer_ready",
          ...base
        })
      : null;

  const externalTransferProviderRequestCreatedEvent = input.providerRequestCreated
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_provider_request_created",
        ...base
      })
    : null;

  const externalTransferProviderRequestSentEvent = input.providerRequestSent
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_provider_request_sent",
        ...base
      })
    : null;

  const externalTransferProviderPendingEvent = providerPending
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_provider_pending",
        ...base
      })
    : null;

  const externalTransferProviderSucceededEvent = input.providerSucceeded
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_provider_succeeded",
        ...base
      })
    : null;

  const externalTransferProviderFailedEvent = input.providerFailed
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_provider_failed",
        ...base,
        verificationStatus: compensationRequired ? "verified" : "rejected"
      })
    : null;

  const externalTransferProviderUnknownEvent = unknown
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_provider_unknown",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const externalTransferCompensationRequiredEvent = compensationRequired
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_compensation_required",
        ...base
      })
    : null;

  const externalTransferCompletedEvent = completed
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_completed",
        ...base
      })
    : null;

  const externalTransferFailedEvent = failed
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_failed",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const externalTransferRequiresReviewEvent = requiresReview
    ? createExternalTransferEvent({
        input,
        eventType: "external_transfer_requires_review",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  return {
    externalTransferId: input.externalTransferId,
    transferType: input.transferType,
    provider: input.provider,
    status,
    userId: input.userId,
    walletId: input.walletId ?? null,
    originalLedgerEntryId: input.originalLedgerEntryId ?? null,
    originalExecutionRequestId: input.originalExecutionRequestId ?? null,
    pipelineId: input.pipelineId ?? null,
    sagaId: input.sagaId ?? null,
    coinCode,
    transferReadinessScore: readinessScore,
    transferSafetyScore: safetyScore,
    ready,
    blocked,
    requiresReview,
    sendToProvider,
    providerPending,
    completed,
    failed,
    compensationRequired,
    unknown,
    compensationSafeToCreate,
    reasons,
    externalTransferCreatedEvent,
    externalTransferValidatingEvent,
    externalTransferBlockedEvent,
    externalTransferReadyEvent,
    externalTransferProviderRequestCreatedEvent,
    externalTransferProviderRequestSentEvent,
    externalTransferProviderPendingEvent,
    externalTransferProviderSucceededEvent,
    externalTransferProviderFailedEvent,
    externalTransferProviderUnknownEvent,
    externalTransferCompensationRequiredEvent,
    externalTransferCompletedEvent,
    externalTransferFailedEvent,
    externalTransferRequiresReviewEvent,
    metadata: {
      ruleTransferType: rule.transferType,
      ...((input.metadata as Record<string, unknown>) ?? {})
    }
  };
}
