import { getProviderReconciliationRule } from "@/data/alphabet/provider-reconciliation-rules";
import type { Json } from "@/types/alphabet/database.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  ProviderReconciliationEvaluationResult,
  ProviderReconciliationSource,
  ProviderWebhookInput
} from "@/types/alphabet/provider-reconciliation.types";
import type { ExternalTransferProvider } from "@/types/alphabet/external-transfer.types";
import { createCompensationForLedgerEntry } from "../compensation/compensation-store";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import {
  getExternalTransferByProviderTransferIdDb,
  updateExternalTransferDb
} from "../db-repositories/external-transfers.repository";
import { listCompensationsForOriginalLedgerDb } from "../db-repositories/compensation.repository";
import {
  getProviderReconciliationByEventDb,
  insertProviderReconciliationRecordDb,
  updateProviderReconciliationRecordDb
} from "../db-repositories/provider-reconciliation.repository";
import { updatePipelineStatusByExecutionDb } from "../db-repositories/pipeline-worker.repository";
import { updateSagaStatusDb } from "../db-repositories/saga-worker.repository";
import { patchExecutionRequestStatusDb } from "../db-repositories/execution-requests.repository";
import { evaluateProviderReconciliation } from "./provider-reconciliation-engine";
import { maybeCreateAdminReviewCaseFromHook } from "../admin-review-hooks/admin-review-hook-store";
import { normalizeProviderWebhookPayload } from "./provider-status-normalizer";
import { verifyProviderWebhook } from "./provider-webhook-verifier";

type ReconcileProviderWebhookDuplicateResult = {
  duplicate: true;
  record: Record<string, unknown>;
  evaluation: null;
  externalTransfer: null;
  compensation: null;
  eventIds: string[];
  publicResponse: { received: true; duplicate: true; status: "reconciliation_ignore_duplicate" };
};

type ReconcileProviderWebhookFullResult = {
  duplicate: false;
  record: Record<string, unknown>;
  evaluation: ProviderReconciliationEvaluationResult;
  externalTransfer: Record<string, unknown> | null;
  compensation: Record<string, unknown> | null;
  eventIds: string[];
  publicResponse: { received: true; duplicate: false; status: string };
};

export type ReconcileProviderWebhookResult =
  | ReconcileProviderWebhookDuplicateResult
  | ReconcileProviderWebhookFullResult;

function resolveVerification(input: ProviderWebhookInput) {
  const source = input.reconciliationSource ?? "webhook";
  if (source === "webhook") {
    return verifyProviderWebhook(input);
  }

  if (input.trustedInternalSource !== true) {
    return verifyProviderWebhook(input);
  }

  if (source === "system_replay") {
    return {
      verified: true,
      signatureConfidenceScore: 1,
      reasonCodes: ["internal_system_replay"]
    };
  }

  const rule = getProviderReconciliationRule(input.provider);
  if (!rule) {
    return {
      verified: false,
      signatureConfidenceScore: 0,
      reasonCodes: ["provider_reconciliation_no_rule_for_trusted_path"]
    };
  }

  if (source === "polling" && !rule.allowsPolling) {
    return {
      verified: false,
      signatureConfidenceScore: 0,
      reasonCodes: ["provider_reconciliation_polling_not_allowed"]
    };
  }

  if (source === "manual_admin_check" && !rule.allowsManualAdminCheck) {
    return {
      verified: false,
      signatureConfidenceScore: 0,
      reasonCodes: ["provider_reconciliation_manual_check_not_allowed"]
    };
  }

  if (source === "provider_dashboard_import" && !rule.allowsManualAdminCheck) {
    return {
      verified: false,
      signatureConfidenceScore: 0,
      reasonCodes: ["provider_reconciliation_dashboard_import_not_allowed"]
    };
  }

  return {
    verified: true,
    signatureConfidenceScore: 1,
    reasonCodes: ["internal_trusted_reconciliation_source"]
  };
}

async function persistAlphabetEventFromEvaluation(event: AlphabetEvent): Promise<string> {
  const saved = await insertAlphabetEvent({
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
    metadata: (event.metadata ?? {}) as Json
  });

  return saved.event_id;
}

async function persistEvaluationEvents(events: Array<AlphabetEvent | null | undefined>): Promise<string[]> {
  const ids: string[] = [];
  for (const event of events) {
    if (!event) continue;
    ids.push(await persistAlphabetEventFromEvaluation(event));
  }
  return ids;
}

function createRiskScores(params: {
  signatureConfidenceScore: number;
  externalTransferExists: boolean;
  replayDetected: boolean;
}) {
  return {
    sourceTrustScore: 0.95,
    signatureConfidenceScore: params.signatureConfidenceScore,
    transferMatchScore: params.externalTransferExists ? 0.96 : 0.2,
    statusConfidenceScore: 0.92,
    replayRiskScore: params.replayDetected ? 0.8 : 0.05,
    compensationTriggerSafetyScore: 0.96
  };
}

function mapReconciliationStatus(outcome: string): string {
  switch (outcome) {
    case "reconciliation_ignore_duplicate":
      return "reconciliation_ignored";
    case "reconciliation_unmatched":
      return "reconciliation_unmatched";
    case "reconciliation_requires_review":
      return "reconciliation_requires_review";
    case "reconciliation_failed":
      return "reconciliation_failed";
    default:
      return "reconciliation_applied";
  }
}

export async function reconcileProviderWebhook(
  input: ProviderWebhookInput
): Promise<ReconcileProviderWebhookResult> {
  const reconciliationSource: ProviderReconciliationSource = input.reconciliationSource ?? "webhook";

  const verification = resolveVerification({ ...input, reconciliationSource });
  const normalized = normalizeProviderWebhookPayload({
    provider: input.provider,
    rawBody: input.rawBody
  });

  if (normalized.providerEventId) {
    const existing = await getProviderReconciliationByEventDb({
      provider: input.provider,
      providerEventId: normalized.providerEventId
    });
    if (existing) {
      return {
        duplicate: true,
        record: existing as Record<string, unknown>,
        evaluation: null,
        externalTransfer: null,
        compensation: null,
        eventIds: [],
        publicResponse: {
          received: true,
          duplicate: true,
          status: "reconciliation_ignore_duplicate"
        }
      };
    }
  }

  const externalTransfer = normalized.providerTransferId
    ? await getExternalTransferByProviderTransferIdDb(normalized.providerTransferId)
    : null;

  let compensationAlreadyCreated = false;
  const ledgerId = externalTransfer?.original_ledger_entry_id as string | null | undefined;
  if (ledgerId) {
    const comps = await listCompensationsForOriginalLedgerDb(ledgerId);
    compensationAlreadyCreated = comps.length > 0;
  }

  const replayDetected = false;

  const riskScores = createRiskScores({
    signatureConfidenceScore: verification.signatureConfidenceScore,
    externalTransferExists: Boolean(externalTransfer),
    replayDetected
  });

  const pollingAttemptCount = input.pollingAttemptCount ?? 0;

  const record = await insertProviderReconciliationRecordDb({
    reconciliationSource,
    provider: input.provider,
    normalizedProviderStatus: normalized.normalizedStatus,
    reconciliationStatus: "reconciliation_received",
    externalTransferId: (externalTransfer?.external_transfer_id as string | null) ?? null,
    providerTransferId: normalized.providerTransferId ?? null,
    providerEventId: normalized.providerEventId ?? null,
    providerRawEventType: normalized.providerRawEventType ?? null,
    providerRawPayload: normalized.rawPayload,
    sanitizedProviderPayload: normalized.sanitizedPayload,
    signatureVerified: verification.verified,
    signatureConfidenceScore: verification.signatureConfidenceScore,
    idempotencyKey: (externalTransfer?.idempotency_key as string | null) ?? null,
    dedupeKey: (externalTransfer?.dedupe_key as string | null) ?? null,
    sourceEventIds: (externalTransfer?.source_event_ids as string[]) ?? [],
    replayDetected,
    pollingAttemptCount,
    riskScores: riskScores as never,
    metadata: {
      verificationReasonCodes: verification.reasonCodes
    } as Json
  });

  const reconciliationId = record.reconciliation_id as string;

  const evaluation = evaluateProviderReconciliation({
    reconciliationId,
    reconciliationSource,
    provider: input.provider,
    normalizedProviderStatus: normalized.normalizedStatus,
    currentReconciliationStatus: "reconciliation_received",
    externalTransferId: (externalTransfer?.external_transfer_id as string | null) ?? null,
    providerTransferId: normalized.providerTransferId ?? null,
    providerEventId: normalized.providerEventId ?? null,
    providerRawEventType: normalized.providerRawEventType ?? null,
    providerRawPayload: normalized.rawPayload,
    sanitizedProviderPayload: normalized.sanitizedPayload,
    signatureVerified: verification.verified,
    signatureConfidenceScore: verification.signatureConfidenceScore,
    idempotencyKey: (externalTransfer?.idempotency_key as string | null) ?? null,
    dedupeKey: (externalTransfer?.dedupe_key as string | null) ?? null,
    sourceEventIds: (externalTransfer?.source_event_ids as string[]) ?? [],
    replayDetected,
    pollingAttemptCount,
    externalTransferExists: Boolean(externalTransfer),
    externalTransferCurrentStatus: (externalTransfer?.status as never) ?? null,
    internalDebitExists: Boolean(externalTransfer?.original_ledger_entry_id),
    compensationAlreadyCreated,
    riskScores,
    now: input.receivedAt,
    metadata: {
      verificationReasonCodes: verification.reasonCodes
    } as Json
  });

  const eventIds = await persistEvaluationEvents([
    evaluation.providerReconciliationReceivedEvent,
    evaluation.providerReconciliationVerifiedEvent,
    evaluation.providerReconciliationUnverifiedEvent,
    evaluation.providerReconciliationMatchedEvent,
    evaluation.providerReconciliationUnmatchedEvent,
    evaluation.providerReconciliationAppliedEvent,
    evaluation.providerReconciliationIgnoredEvent,
    evaluation.providerReconciliationRequiresReviewEvent,
    evaluation.providerReconciliationFailedEvent
  ]);

  await updateProviderReconciliationRecordDb({
    reconciliationId,
    reconciliationStatus: mapReconciliationStatus(evaluation.status),
    metadata: {
      evaluationOutcome: evaluation.status,
      eventIds
    } as Json
  });

  const rule = getProviderReconciliationRule(input.provider);
  const verificationBlocksTransferMutation =
    Boolean(rule?.requiresWebhookSignature) && !verification.verified;

  const execId = externalTransfer?.original_execution_request_id as string | null | undefined;
  const sagaId = externalTransfer?.saga_id as string | null | undefined;
  const extId = externalTransfer?.external_transfer_id as string | undefined;

  const completing =
    evaluation.shouldCompletePipeline &&
    Boolean(externalTransfer) &&
    Boolean(extId) &&
    !verificationBlocksTransferMutation;

  const failingUnknown =
    evaluation.shouldFailPipeline &&
    Boolean(externalTransfer) &&
    Boolean(extId) &&
    !verificationBlocksTransferMutation;

  const shouldMutateIntermediate =
    evaluation.shouldUpdateExternalTransfer &&
    Boolean(externalTransfer) &&
    Boolean(extId) &&
    Boolean(evaluation.nextExternalTransferStatus) &&
    !verificationBlocksTransferMutation &&
    !completing;

  if (shouldMutateIntermediate) {
    await updateExternalTransferDb({
      externalTransferId: extId!,
      status: evaluation.nextExternalTransferStatus!,
      providerStatus: normalized.normalizedStatus,
      providerResponse: normalized.sanitizedPayload,
      metadata: {
        reconciliationId,
        eventIds
      } as Json
    });
  }

  if (completing && execId) {
    await updatePipelineStatusByExecutionDb({
      executionRequestId: execId,
      status: "pipeline_completed"
    });

    if (sagaId) {
      await updateSagaStatusDb({
        sagaId,
        status: "saga_completed"
      });
    }

    await updateExternalTransferDb({
      externalTransferId: extId!,
      status: "transfer_completed",
      providerStatus: normalized.normalizedStatus,
      providerResponse: normalized.sanitizedPayload,
      metadata: {
        reconciliationId,
        eventIds
      } as Json
    });

    await patchExecutionRequestStatusDb({
      executionRequestId: execId,
      status: "external_transfer_completed"
    });
  }

  if (failingUnknown && execId) {
    await updatePipelineStatusByExecutionDb({
      executionRequestId: execId,
      status: "pipeline_failed"
    });

    if (sagaId) {
      await updateSagaStatusDb({
        sagaId,
        status: "saga_failed"
      });
    }

    await updateExternalTransferDb({
      externalTransferId: extId!,
      status: "transfer_requires_review",
      providerStatus: normalized.normalizedStatus,
      providerResponse: normalized.sanitizedPayload,
      metadata: {
        reconciliationId,
        eventIds
      } as Json
    });

    await patchExecutionRequestStatusDb({
      executionRequestId: execId,
      status: "external_transfer_unknown"
    });
  }

  let compensation: Record<string, unknown> | null = null;

  if (
    evaluation.compensationSafeToCreate &&
    externalTransfer?.original_ledger_entry_id &&
    !verificationBlocksTransferMutation
  ) {
    compensation = await createCompensationForLedgerEntry({
      originalLedgerEntryId: externalTransfer.original_ledger_entry_id as string,
      compensationType: "withdrawal_reversal",
      triggerType: "external_transfer_failed",
      amount: Number(externalTransfer.amount),
      coinCode: String(externalTransfer.coin_code ?? "J"),
      originalUserId: String(externalTransfer.user_id),
      originalWalletId: (externalTransfer.wallet_id as string | null) ?? null,
      originalWalletAccountId: (externalTransfer.wallet_account_id as string | null) ?? null,
      originalExecutionRequestId: (externalTransfer.original_execution_request_id as string | null) ?? null,
      originalSagaId: (externalTransfer.saga_id as string | null) ?? null,
      originalPipelineId: (externalTransfer.pipeline_id as string | null) ?? null,
      idempotencyKey: `comp:${String(externalTransfer.idempotency_key ?? "")}`,
      dedupeKey: `comp:${String(externalTransfer.dedupe_key ?? "")}`,
      reasonCodes: evaluation.reasons,
      requiresReview: true,
      reviewApproved: false,
      externalTransferMayHaveStarted: false,
      externalTransferConfirmedFailed: true,
      sourceEventIds: (externalTransfer.source_event_ids as string[]) ?? [],
      metadata: {
        reconciliationId,
        providerTransferId: normalized.providerTransferId
      } as Json
    });

    if (execId) {
      await patchExecutionRequestStatusDb({
        executionRequestId: execId,
        status: "external_transfer_compensation_required"
      });
    }
  } else if (
    evaluation.applyFailure &&
    execId &&
    !evaluation.compensationSafeToCreate &&
    !verificationBlocksTransferMutation
  ) {
    await patchExecutionRequestStatusDb({
      executionRequestId: execId,
      status: "external_transfer_failed"
    });
  }

  if (
    evaluation.unmatched ||
    evaluation.failed ||
    evaluation.requiresReview ||
    evaluation.applyUnknown
  ) {
    const hookTrigger = evaluation.unmatched
      ? "provider_reconciliation_unmatched"
      : evaluation.failed
        ? "provider_reconciliation_signature_failed"
        : "provider_reconciliation_unknown";

    await maybeCreateAdminReviewCaseFromHook({
      hookSource: "provider_reconciliation",
      hookTrigger,
      subjectIds: {
        userId: (externalTransfer?.user_id as string | null | undefined) ?? null,
        walletId: (externalTransfer?.wallet_id as string | null | undefined) ?? null,
        externalTransferId: (externalTransfer?.external_transfer_id as string | null | undefined) ?? null,
        providerReconciliationId: reconciliationId,
        executionRequestId: (externalTransfer?.original_execution_request_id as string | null | undefined) ?? null,
        pipelineId: (externalTransfer?.pipeline_id as string | null | undefined) ?? null,
        sagaId: (externalTransfer?.saga_id as string | null | undefined) ?? null
      },
      sourceObjectType: "provider_reconciliation",
      sourceObjectId: reconciliationId,
      rawEvidence: {
        reconciliationRecord: record,
        evaluation,
        normalized,
        verification,
        externalTransfer
      } as never,
      publicSummary: "A provider update needs platform review.",
      internalSummary:
        "Provider reconciliation produced an unmatched, failed, review, or unknown state.",
      sourceEventIds: eventIds,
      riskScore: 1 - evaluation.reconciliationSafetyScore,
      uncertaintyScore: evaluation.applyUnknown || evaluation.unmatched ? 0.9 : 0.65,
      userImpactScore: 0.8,
      platformImpactScore: 0.85,
      moneyMovementPossible: Boolean(externalTransfer?.original_ledger_entry_id),
      paymentUncertainty: evaluation.applyUnknown,
      fraudSuspected: evaluation.failed && !verification.verified,
      userVisible: false,
      existingOpenReviewCaseCount: 0,
      now: new Date().toISOString(),
      metadata: {
        reconciliationStatus: evaluation.status,
        provider: input.provider
      }
    });
  }

  return {
    duplicate: false,
    record: record as Record<string, unknown>,
    evaluation,
    externalTransfer: externalTransfer as Record<string, unknown> | null,
    compensation,
    eventIds,
    publicResponse: {
      received: true,
      duplicate: false,
      status: evaluation.status
    }
  };
}

export async function reconcileProviderStatus(params: {
  reconciliationSource: ProviderReconciliationSource;
  provider: ExternalTransferProvider;
  providerTransferId: string;
  providerStatus: string;
  providerResponse?: Record<string, unknown>;
  pollingAttemptCount?: number;
}) {
  const rawBody = JSON.stringify({
    id: `poll_${params.providerTransferId}_${Date.now()}`,
    type: "poll.status",
    providerTransferId: params.providerTransferId,
    status: params.providerStatus,
    data: {
      providerTransferId: params.providerTransferId,
      status: params.providerStatus,
      ...(params.providerResponse ?? {})
    }
  });

  return reconcileProviderWebhook({
    provider: params.provider,
    rawBody,
    headers: {},
    receivedAt: new Date().toISOString(),
    reconciliationSource: params.reconciliationSource,
    trustedInternalSource: true,
    pollingAttemptCount: params.pollingAttemptCount
  });
}
