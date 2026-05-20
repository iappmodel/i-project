import { getProviderReconciliationRule } from "@/data/alphabet/provider-reconciliation-rules";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  ProviderReconciliationEvaluationResult,
  ProviderReconciliationOutcomeStatus,
  ProviderReconciliationRuleSet,
  ProviderReconciliationSignalInput
} from "@/types/alphabet/provider-reconciliation.types";
import type { ExternalTransferStatus } from "@/types/alphabet/external-transfer.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function calculateReconciliationConfidenceScore(
  input: ProviderReconciliationSignalInput,
  rule?: ProviderReconciliationRuleSet | null
): number {
  let score = 0;

  score += input.provider ? 0.08 : 0;
  score += input.normalizedProviderStatus ? 0.1 : 0;
  score += input.providerTransferId ? 0.14 : 0;
  score += input.externalTransferExists ? 0.16 : 0;
  score += input.providerEventId ? 0.08 : 0;

  if (rule?.requiresWebhookSignature) {
    score += input.signatureVerified ? 0.16 : 0;
  } else {
    score += 0.08;
  }

  score += input.riskScores.sourceTrustScore * 0.1;
  score += input.riskScores.signatureConfidenceScore * 0.1;
  score += input.riskScores.transferMatchScore * 0.12;
  score += input.riskScores.statusConfidenceScore * 0.12;

  return clamp(score);
}

function calculateReconciliationSafetyScore(input: ProviderReconciliationSignalInput): number {
  let score = 1;

  score -= input.replayDetected ? 0.2 : 0;
  score -= input.riskScores.replayRiskScore * 0.25;
  score -= input.normalizedProviderStatus === "provider_unknown" ? 0.25 : 0;
  score -= !input.externalTransferExists ? 0.35 : 0;
  score -=
    input.normalizedProviderStatus === "provider_failed" && !input.internalDebitExists ? 0.2 : 0;
  score += input.riskScores.compensationTriggerSafetyScore * 0.12;

  return clamp(score);
}

function mapProviderStatusToTransferStatus(status: string): ExternalTransferStatus {
  switch (status) {
    case "provider_pending":
    case "provider_processing":
    case "provider_created":
      return "provider_pending";
    case "provider_succeeded":
      return "provider_succeeded";
    case "provider_failed":
    case "provider_returned":
    case "provider_reversed":
      return "provider_failed";
    case "provider_canceled":
      return "provider_canceled";
    case "provider_unknown":
    default:
      return "provider_unknown";
  }
}

function decideOutcome(params: {
  input: ProviderReconciliationSignalInput;
  rule: ProviderReconciliationRuleSet;
  confidenceScore: number;
  safetyScore: number;
  reasons: string[];
}): ProviderReconciliationOutcomeStatus {
  const { input, rule, confidenceScore, safetyScore, reasons } = params;

  if (input.replayDetected && rule.duplicateEventIgnored) {
    reasons.push("provider_reconciliation_duplicate_event_ignored");
    return "reconciliation_ignore_duplicate";
  }

  if (rule.requiresWebhookSignature && !input.signatureVerified) {
    reasons.push("provider_reconciliation_signature_unverified");
    return "reconciliation_failed";
  }

  if (!input.externalTransferExists) {
    reasons.push("provider_reconciliation_external_transfer_unmatched");
    return "reconciliation_unmatched";
  }

  if (input.riskScores.sourceTrustScore < rule.minSourceTrustScore) {
    reasons.push("provider_reconciliation_source_trust_below_minimum");
    return "reconciliation_requires_review";
  }

  if (input.riskScores.signatureConfidenceScore < rule.minSignatureConfidenceScore) {
    reasons.push("provider_reconciliation_signature_confidence_below_minimum");
    return "reconciliation_requires_review";
  }

  if (input.riskScores.transferMatchScore < rule.minTransferMatchScore) {
    reasons.push("provider_reconciliation_transfer_match_below_minimum");
    return "reconciliation_requires_review";
  }

  if (input.riskScores.statusConfidenceScore < rule.minStatusConfidenceScore) {
    reasons.push("provider_reconciliation_status_confidence_below_minimum");
    return "reconciliation_requires_review";
  }

  if (input.riskScores.replayRiskScore > rule.maxReplayRiskScore) {
    reasons.push("provider_reconciliation_replay_risk_above_maximum");
    return "reconciliation_requires_review";
  }

  if (confidenceScore < rule.minReconciliationConfidenceScore) {
    reasons.push("provider_reconciliation_confidence_below_minimum");
    return "reconciliation_requires_review";
  }

  if (safetyScore < rule.minReconciliationSafetyScore) {
    reasons.push("provider_reconciliation_safety_below_minimum");
    return "reconciliation_requires_review";
  }

  if (input.normalizedProviderStatus === "provider_unknown") {
    reasons.push("provider_reconciliation_apply_unknown");
    return "reconciliation_apply_unknown";
  }

  if (
    input.normalizedProviderStatus === "provider_failed" ||
    input.normalizedProviderStatus === "provider_returned" ||
    input.normalizedProviderStatus === "provider_reversed"
  ) {
    reasons.push("provider_reconciliation_apply_failure");
    return "reconciliation_apply_failure";
  }

  if (input.normalizedProviderStatus === "provider_succeeded") {
    reasons.push("provider_reconciliation_apply_success");
    return "reconciliation_apply_success";
  }

  reasons.push("provider_reconciliation_apply_pending");
  return "reconciliation_apply_pending";
}

function createProviderReconciliationEvent(params: {
  input: ProviderReconciliationSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: ALPHABET_SYSTEM_USER_ID,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "provider_reconciliation",
    objectId: params.input.reconciliationId,
    sourceContext: "provider_reconciliation",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      reconciliationId: params.input.reconciliationId,
      reconciliationSource: params.input.reconciliationSource,
      provider: params.input.provider,
      normalizedProviderStatus: params.input.normalizedProviderStatus,
      externalTransferId: params.input.externalTransferId ?? null,
      providerTransferId: params.input.providerTransferId ?? null,
      providerEventId: params.input.providerEventId ?? null,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateProviderReconciliation(
  input: ProviderReconciliationSignalInput
): ProviderReconciliationEvaluationResult {
  const reasons: string[] = [];
  const rule = getProviderReconciliationRule(input.provider);

  const confidenceScore = calculateReconciliationConfidenceScore(input, rule);
  const safetyScore = calculateReconciliationSafetyScore(input);

  if (!rule) {
    reasons.push("no_active_provider_reconciliation_rule");

    const providerReconciliationReceivedEvent = createProviderReconciliationEvent({
      input,
      eventType: "provider_reconciliation_received",
      rawScore: confidenceScore,
      qualityScore: safetyScore,
      riskScore: 1 - safetyScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      reconciliationId: input.reconciliationId,
      reconciliationSource: input.reconciliationSource,
      provider: input.provider,
      status: "reconciliation_failed",
      normalizedProviderStatus: input.normalizedProviderStatus,
      externalTransferId: input.externalTransferId ?? null,
      providerTransferId: input.providerTransferId ?? null,
      providerEventId: input.providerEventId ?? null,
      reconciliationConfidenceScore: confidenceScore,
      reconciliationSafetyScore: safetyScore,
      applyPending: false,
      applySuccess: false,
      applyFailure: false,
      applyUnknown: false,
      ignoreDuplicate: false,
      unmatched: false,
      requiresReview: false,
      failed: true,
      shouldUpdateExternalTransfer: false,
      nextExternalTransferStatus: null,
      shouldCompletePipeline: false,
      shouldFailPipeline: false,
      shouldTriggerCompensation: false,
      compensationSafeToCreate: false,
      reasons,
      providerReconciliationReceivedEvent,
      providerReconciliationVerifiedEvent: null,
      providerReconciliationUnverifiedEvent: null,
      providerReconciliationMatchedEvent: null,
      providerReconciliationUnmatchedEvent: null,
      providerReconciliationAppliedEvent: null,
      providerReconciliationIgnoredEvent: null,
      providerReconciliationRequiresReviewEvent: null,
      providerReconciliationFailedEvent: providerReconciliationReceivedEvent,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideOutcome({
    input,
    rule,
    confidenceScore,
    safetyScore,
    reasons
  });

  const applyPending = status === "reconciliation_apply_pending";
  const applySuccess = status === "reconciliation_apply_success";
  const applyFailure = status === "reconciliation_apply_failure";
  const applyUnknown = status === "reconciliation_apply_unknown";
  const ignoreDuplicate = status === "reconciliation_ignore_duplicate";
  const unmatched = status === "reconciliation_unmatched";
  const requiresReview = status === "reconciliation_requires_review";
  const failed = status === "reconciliation_failed";

  const nextExternalTransferStatus =
    applyPending || applySuccess || applyFailure || applyUnknown
      ? mapProviderStatusToTransferStatus(input.normalizedProviderStatus)
      : null;

  const shouldTriggerCompensation =
    applyFailure &&
    input.internalDebitExists &&
    !input.compensationAlreadyCreated &&
    input.riskScores.compensationTriggerSafetyScore >= rule.minCompensationTriggerSafetyScore;

  const compensationSafeToCreate =
    shouldTriggerCompensation && input.normalizedProviderStatus !== "provider_unknown";

  const shouldCompletePipeline = applySuccess;
  /** Align with external-transfer-store: unknown provider state fails pipeline; hard failure defers to compensation path. */
  const shouldFailPipeline = applyUnknown;

  const verificationStatus: AlphabetEvent["verificationStatus"] =
    failed || unmatched || requiresReview || applyUnknown ? "rejected" : "verified";

  const base = {
    rawScore: confidenceScore,
    qualityScore: safetyScore,
    riskScore: 1 - safetyScore,
    verificationStatus,
    metadata: { status, reasons }
  };

  const providerReconciliationReceivedEvent = createProviderReconciliationEvent({
    input,
    eventType: "provider_reconciliation_received",
    ...base
  });

  const providerReconciliationVerifiedEvent = input.signatureVerified
    ? createProviderReconciliationEvent({
        input,
        eventType: "provider_reconciliation_verified",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const providerReconciliationUnverifiedEvent = !input.signatureVerified
    ? createProviderReconciliationEvent({
        input,
        eventType: "provider_reconciliation_unverified",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const providerReconciliationMatchedEvent = input.externalTransferExists
    ? createProviderReconciliationEvent({
        input,
        eventType: "provider_reconciliation_matched",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const providerReconciliationUnmatchedEvent = unmatched
    ? createProviderReconciliationEvent({
        input,
        eventType: "provider_reconciliation_unmatched",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const providerReconciliationAppliedEvent =
    applyPending || applySuccess || applyFailure || applyUnknown
      ? createProviderReconciliationEvent({
          input,
          eventType: "provider_reconciliation_applied",
          ...base
        })
      : null;

  const providerReconciliationIgnoredEvent = ignoreDuplicate
    ? createProviderReconciliationEvent({
        input,
        eventType: "provider_reconciliation_ignored",
        ...base
      })
    : null;

  const providerReconciliationRequiresReviewEvent = requiresReview
    ? createProviderReconciliationEvent({
        input,
        eventType: "provider_reconciliation_requires_review",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const providerReconciliationFailedEvent = failed
    ? createProviderReconciliationEvent({
        input,
        eventType: "provider_reconciliation_failed",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  return {
    reconciliationId: input.reconciliationId,
    reconciliationSource: input.reconciliationSource,
    provider: input.provider,
    status,
    normalizedProviderStatus: input.normalizedProviderStatus,
    externalTransferId: input.externalTransferId ?? null,
    providerTransferId: input.providerTransferId ?? null,
    providerEventId: input.providerEventId ?? null,
    reconciliationConfidenceScore: confidenceScore,
    reconciliationSafetyScore: safetyScore,
    applyPending,
    applySuccess,
    applyFailure,
    applyUnknown,
    ignoreDuplicate,
    unmatched,
    requiresReview,
    failed,
    shouldUpdateExternalTransfer: Boolean(nextExternalTransferStatus),
    nextExternalTransferStatus,
    shouldCompletePipeline,
    shouldFailPipeline,
    shouldTriggerCompensation,
    compensationSafeToCreate,
    reasons,
    providerReconciliationReceivedEvent,
    providerReconciliationVerifiedEvent,
    providerReconciliationUnverifiedEvent,
    providerReconciliationMatchedEvent,
    providerReconciliationUnmatchedEvent,
    providerReconciliationAppliedEvent,
    providerReconciliationIgnoredEvent,
    providerReconciliationRequiresReviewEvent,
    providerReconciliationFailedEvent,
    metadata: {
      ruleProvider: rule.provider,
      ...((input.metadata as Record<string, unknown>) ?? {})
    }
  };
}
