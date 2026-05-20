import type { DbExecutionRequest, Json } from "@/types/alphabet/database.types";
import type {
  ExternalTransferProvider,
  ExternalTransferRiskScores,
  ExternalTransferType
} from "@/types/alphabet/external-transfer.types";
import type { ExternalTransferProviderAdapter } from "./external-transfer-provider-contract";
import { sanitizeProviderPayload } from "./external-transfer-provider-contract";
import { MockPayoutProvider } from "./mock-payout-provider";
import { evaluateExternalTransfer } from "./external-transfer-engine";
import {
  insertExternalTransferDb,
  updateExternalTransferDb,
  getExternalTransferDb
} from "../db-repositories/external-transfers.repository";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import { createCompensationForLedgerEntry } from "../compensation/compensation-store";
import { updatePipelineStatusByExecutionDb } from "../db-repositories/pipeline-worker.repository";
import { updateSagaStatusDb } from "../db-repositories/saga-worker.repository";
import { patchExecutionRequestStatusDb } from "../db-repositories/execution-requests.repository";
import { insertAuditRecordDb } from "../db-repositories/audits.repository";
import { insertNotificationRecordDb } from "../db-repositories/notifications.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import { maybeCreateAdminReviewCaseFromHook } from "../admin-review-hooks/admin-review-hook-store";

function defaultProvider(provider: ExternalTransferProvider): ExternalTransferProviderAdapter {
  switch (provider) {
    case "mock":
      return new MockPayoutProvider();
    default:
      return new MockPayoutProvider();
  }
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

function metaPipelineSaga(metadata?: Record<string, unknown>) {
  const m = metadata ?? {};
  const pipelineId = typeof m.pipelineId === "string" ? m.pipelineId : null;
  const sagaId = typeof m.sagaId === "string" ? m.sagaId : null;
  return { pipelineId, sagaId };
}

async function recordTransferAuditAndNotification(params: {
  executionRequest: DbExecutionRequest;
  workerId: string;
  userId: string;
  walletId?: string | null;
  externalTransferId: string;
  headline: string;
  detail: string;
  internalCodes: string[];
}) {
  const audit = await insertAuditRecordDb({
    auditType: "external_transfer_state",
    status: "created",
    userId: params.userId,
    executionRequestId: params.executionRequest.execution_request_id,
    sourceEventIds: params.executionRequest.source_event_ids,
    publicSummary: params.headline,
    internalSummary: params.detail,
    evidence: {
      externalTransferId: params.externalTransferId,
      executionRequestId: params.executionRequest.execution_request_id
    } as Json,
    redactedEvidence: {
      externalTransferId: params.externalTransferId
    } as Json,
    riskSummary: {} as Json,
    metadata: {
      workerId: params.workerId,
      walletId: params.walletId ?? null
    } as Json
  });

  const note = await insertNotificationRecordDb({
    recipientUserId: params.userId,
    sourceSystem: "external_transfer",
    sourceObjectId: params.externalTransferId,
    sourceEventIds: params.executionRequest.source_event_ids,
    category: "wallet",
    severity: "info",
    status: "created",
    title: "Payout status",
    body: params.headline,
    explanationClass: "external_transfer",
    objectLabel: "payout",
    internalReasonCodes: params.internalCodes,
    privacySensitivity: "medium",
    dedupeKey: params.executionRequest.dedupe_key,
    metadata: {
      workerId: params.workerId,
      externalTransferId: params.externalTransferId
    } as Json
  });

  return { auditRecordId: audit.audit_record_id, notificationId: note.notification_id };
}

export async function createAndProcessExternalTransfer(params: {
  transferType: ExternalTransferType;
  provider?: ExternalTransferProvider;

  userId: string;
  walletId?: string | null;
  walletAccountId?: string | null;

  originalExecutionRequestId?: string | null;
  originalLedgerEntryId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;

  amount: number;
  coinCode: string;

  fiatAmount?: number | null;
  fiatCurrency?: string | null;

  destinationType?: string | null;
  destinationLabel?: string | null;

  idempotencyKey: string;
  dedupeKey: string;

  sourceEventIds?: string[];

  riskScores?: Partial<ExternalTransferRiskScores>;

  reviewApproved?: boolean;

  providerAdapter?: ExternalTransferProviderAdapter;

  metadata?: Record<string, unknown>;

  /** When set, internal debit is treated as posted even if ledger id is omitted (e.g. tests). */
  internalDebitPosted?: boolean;

  recordSideEffects?: {
    executionRequest: DbExecutionRequest;
    workerId: string;
  };
}) {
  const provider = params.provider ?? "mock";
  const meta = { ...(params.metadata ?? {}) } as Record<string, unknown>;
  const { pipelineId: metaPipe, sagaId: metaSaga } = metaPipelineSaga(meta);
  const pipelineId = params.pipelineId ?? metaPipe;
  const sagaId = params.sagaId ?? metaSaga;

  const riskScores: ExternalTransferRiskScores = {
    transferEligibilityScore: params.riskScores?.transferEligibilityScore ?? 0.95,
    destinationConfidenceScore: params.riskScores?.destinationConfidenceScore ?? 0.95,
    providerReadinessScore: params.riskScores?.providerReadinessScore ?? 0.95,
    complianceScore: params.riskScores?.complianceScore ?? 0.96,
    transferFraudRisk: params.riskScores?.transferFraudRisk ?? 0.03,
    reversalSafetyScore: params.riskScores?.reversalSafetyScore ?? 0.96
  };

  const internalDebitExists =
    params.internalDebitPosted === true ||
    (params.internalDebitPosted !== false && Boolean(params.originalLedgerEntryId));

  const transfer = await insertExternalTransferDb({
    transferType: params.transferType,
    provider,
    status: "transfer_created",
    userId: params.userId,
    walletId: params.walletId ?? null,
    walletAccountId: params.walletAccountId ?? null,
    originalExecutionRequestId: params.originalExecutionRequestId ?? null,
    originalLedgerEntryId: params.originalLedgerEntryId ?? null,
    pipelineId,
    sagaId,
    amount: params.amount,
    coinCode: params.coinCode,
    fiatAmount: params.fiatAmount ?? null,
    fiatCurrency: params.fiatCurrency ?? null,
    destinationType: params.destinationType ?? null,
    destinationLabel: params.destinationLabel ?? null,
    idempotencyKey: params.idempotencyKey,
    dedupeKey: params.dedupeKey,
    sourceEventIds: params.sourceEventIds ?? [],
    riskScores: riskScores as unknown as Json,
    metadata: meta as unknown as Json
  });

  const transferId = transfer.external_transfer_id as string;

  const initial = evaluateExternalTransfer({
    externalTransferId: transferId,
    transferType: params.transferType,
    provider,
    currentStatus: "transfer_created",
    userId: params.userId,
    walletId: params.walletId ?? null,
    walletAccountId: params.walletAccountId ?? null,
    originalExecutionRequestId: params.originalExecutionRequestId ?? null,
    originalLedgerEntryId: params.originalLedgerEntryId ?? null,
    pipelineId,
    sagaId,
    amount: params.amount,
    coinCode: params.coinCode,
    fiatAmount: params.fiatAmount ?? null,
    fiatCurrency: params.fiatCurrency ?? null,
    providerPayload: {},
    providerResponse: {},
    destinationType: params.destinationType ?? null,
    destinationLabel: params.destinationLabel ?? null,
    idempotencyKey: params.idempotencyKey,
    dedupeKey: params.dedupeKey,
    sourceEventIds: params.sourceEventIds ?? [],
    riskScores,
    providerRequestCreated: false,
    providerRequestSent: false,
    providerPending: false,
    providerSucceeded: false,
    providerFailed: false,
    providerCanceled: false,
    providerUnknown: false,
    internalDebitExists,
    compensationAlreadyCreated: false,
    reviewApproved: params.reviewApproved ?? false,
    cancelRequested: false,
    now: new Date().toISOString(),
    metadata: meta as Json
  });

  const initialEventIds = await persistEvaluationEvents([
    initial.externalTransferCreatedEvent,
    initial.externalTransferValidatingEvent,
    initial.externalTransferReadyEvent,
    initial.externalTransferRequiresReviewEvent,
    initial.externalTransferBlockedEvent
  ]);

  if (initial.blocked || initial.requiresReview || initial.failed) {
    const rowStatus = initial.blocked
      ? "transfer_blocked"
      : initial.requiresReview
        ? "transfer_requires_review"
        : "transfer_failed";

    await updateExternalTransferDb({
      externalTransferId: transferId,
      status: rowStatus,
      metadata: { evaluation: initial } as unknown as Json
    });

    const earlyAuditIds: string[] = [];
    const earlyNotificationIds: string[] = [];

    if (params.recordSideEffects) {
      const { auditRecordId, notificationId } = await recordTransferAuditAndNotification({
        ...params.recordSideEffects,
        userId: params.userId,
        walletId: params.walletId,
        externalTransferId: transferId,
        headline: initial.blocked
          ? "Payout blocked before provider."
          : initial.requiresReview
            ? "Payout requires review before sending to provider."
            : "Payout could not start (no active rule).",
        detail: initial.reasons.join("; "),
        internalCodes: initial.reasons
      });
      earlyAuditIds.push(auditRecordId);
      earlyNotificationIds.push(notificationId);
    }

    if (params.originalExecutionRequestId && (initial.blocked || initial.failed)) {
      await patchExecutionRequestStatusDb({
        executionRequestId: params.originalExecutionRequestId,
        status: initial.failed ? "external_transfer_failed" : "external_transfer_blocked"
      });
    }

    if (initial.requiresReview || initial.unknown || initial.compensationRequired) {
      await maybeCreateAdminReviewCaseFromHook({
        hookSource: "external_transfer",
        hookTrigger: initial.unknown
          ? "external_transfer_unknown"
          : initial.compensationRequired
            ? "external_transfer_compensation_required"
            : "external_transfer_requires_review",
        subjectIds: {
          userId: params.userId,
          walletId: params.walletId ?? null,
          externalTransferId: transferId,
          pipelineId: pipelineId ?? null,
          sagaId: sagaId ?? null,
          executionRequestId: params.originalExecutionRequestId ?? null
        },
        sourceObjectType: "external_transfer",
        sourceObjectId: transferId,
        rawEvidence: {
          transfer,
          evaluation: initial,
          providerResult: null
        } as never,
        publicSummary: "An external transfer needs platform review.",
        internalSummary: "External transfer entered review-worthy state (early evaluation).",
        sourceEventIds: initialEventIds,
        riskScore: 1 - initial.transferSafetyScore,
        uncertaintyScore: initial.unknown ? 0.95 : 0.65,
        userImpactScore: 0.9,
        platformImpactScore: 0.9,
        moneyMovementPossible: true,
        paymentUncertainty: initial.unknown,
        fraudSuspected: false,
        userVisible: true,
        existingOpenReviewCaseCount: 0,
        now: new Date().toISOString(),
        metadata: {
          transferStatus: initial.status,
          provider
        }
      });
    }

    return {
      transfer,
      evaluation: initial,
      providerResult: null,
      compensation: null,
      auditRecordIds: earlyAuditIds,
      notificationIds: earlyNotificationIds,
      eventIds: initialEventIds
    };
  }

  const adapter = params.providerAdapter ?? defaultProvider(provider);

  const providerPayload = sanitizeProviderPayload({
    externalTransferId: transferId,
    amount: params.amount,
    coinCode: params.coinCode,
    fiatAmount: params.fiatAmount ?? null,
    fiatCurrency: params.fiatCurrency ?? null,
    destinationType: params.destinationType ?? null,
    destinationLabel: params.destinationLabel ?? null
  });

  await updateExternalTransferDb({
    externalTransferId: transferId,
    status: "provider_request_created",
    metadata: { providerPayload } as Json
  });

  const providerResult = await adapter.createTransfer({
    externalTransferId: transferId,
    idempotencyKey: params.idempotencyKey,
    amount: params.amount,
    coinCode: params.coinCode,
    fiatAmount: params.fiatAmount ?? null,
    fiatCurrency: params.fiatCurrency ?? null,
    destinationType: params.destinationType ?? null,
    destinationLabel: params.destinationLabel ?? null,
    metadata: meta as Json
  });

  const providerRowStatus =
    providerResult.providerStatus === "succeeded"
      ? "provider_succeeded"
      : providerResult.providerStatus === "failed"
        ? "provider_failed"
        : providerResult.providerStatus === "unknown"
          ? "provider_unknown"
          : providerResult.providerStatus === "canceled"
            ? "provider_canceled"
            : "provider_pending";

  await updateExternalTransferDb({
    externalTransferId: transferId,
    status: providerRowStatus,
    providerTransferId: providerResult.providerTransferId ?? null,
    providerStatus: providerResult.providerStatus,
    providerResponse: providerResult.providerResponse,
    metadata: {
      providerPayload,
      providerResult
    } as unknown as Json
  });

  const finalEvaluation = evaluateExternalTransfer({
    externalTransferId: transferId,
    transferType: params.transferType,
    provider,
    currentStatus: providerRowStatus as never,
    userId: params.userId,
    walletId: params.walletId ?? null,
    walletAccountId: params.walletAccountId ?? null,
    originalExecutionRequestId: params.originalExecutionRequestId ?? null,
    originalLedgerEntryId: params.originalLedgerEntryId ?? null,
    pipelineId,
    sagaId,
    amount: params.amount,
    coinCode: params.coinCode,
    fiatAmount: params.fiatAmount ?? null,
    fiatCurrency: params.fiatCurrency ?? null,
    providerTransferId: providerResult.providerTransferId ?? null,
    providerStatus: providerResult.providerStatus,
    providerPayload: providerPayload as Json,
    providerResponse: providerResult.providerResponse,
    destinationType: params.destinationType ?? null,
    destinationLabel: params.destinationLabel ?? null,
    idempotencyKey: params.idempotencyKey,
    dedupeKey: params.dedupeKey,
    sourceEventIds: params.sourceEventIds ?? [],
    riskScores,
    providerRequestCreated: true,
    providerRequestSent: true,
    providerPending: providerResult.providerStatus === "pending",
    providerSucceeded: providerResult.providerStatus === "succeeded",
    providerFailed: providerResult.providerStatus === "failed",
    providerCanceled: providerResult.providerStatus === "canceled",
    providerUnknown: providerResult.providerStatus === "unknown",
    internalDebitExists,
    compensationAlreadyCreated: false,
    reviewApproved: params.reviewApproved ?? false,
    cancelRequested: false,
    now: new Date().toISOString(),
    metadata: meta as Json
  });

  const finalEventIds = await persistEvaluationEvents([
    finalEvaluation.externalTransferProviderRequestCreatedEvent,
    finalEvaluation.externalTransferProviderRequestSentEvent,
    finalEvaluation.externalTransferProviderPendingEvent,
    finalEvaluation.externalTransferProviderSucceededEvent,
    finalEvaluation.externalTransferProviderFailedEvent,
    finalEvaluation.externalTransferProviderUnknownEvent,
    finalEvaluation.externalTransferCompensationRequiredEvent,
    finalEvaluation.externalTransferCompletedEvent,
    finalEvaluation.externalTransferFailedEvent,
    finalEvaluation.externalTransferRequiresReviewEvent
  ]);

  let compensation: Record<string, unknown> | null = null;

  if (finalEvaluation.compensationSafeToCreate && params.originalLedgerEntryId) {
    compensation = await createCompensationForLedgerEntry({
      originalLedgerEntryId: params.originalLedgerEntryId,
      compensationType: "withdrawal_reversal",
      triggerType: "external_transfer_failed",
      amount: params.amount,
      coinCode: params.coinCode,
      originalUserId: params.userId,
      originalWalletId: params.walletId ?? null,
      originalWalletAccountId: params.walletAccountId ?? null,
      originalExecutionRequestId: params.originalExecutionRequestId ?? null,
      originalSagaId: sagaId,
      originalPipelineId: pipelineId,
      idempotencyKey: `comp:${params.idempotencyKey}`,
      dedupeKey: `comp:${params.dedupeKey}`,
      reasonCodes: finalEvaluation.reasons,
      requiresReview: true,
      reviewApproved: false,
      externalTransferMayHaveStarted: true,
      externalTransferConfirmedFailed: true,
      sourceEventIds: params.sourceEventIds ?? [],
      metadata: {
        externalTransferId: transferId,
        providerTransferId: providerResult.providerTransferId ?? null
      } as Json
    });
  }

  const auditRecordIds: string[] = [];
  const notificationIds: string[] = [];

  if (params.recordSideEffects) {
    const { auditRecordId, notificationId } = await recordTransferAuditAndNotification({
      ...params.recordSideEffects,
      userId: params.userId,
      walletId: params.walletId,
      externalTransferId: transferId,
      headline: finalEvaluation.completed
        ? "External payout completed."
        : finalEvaluation.unknown
          ? "External payout state unknown — review required."
          : finalEvaluation.compensationRequired
            ? "External payout failed; compensation record created for review."
            : finalEvaluation.providerPending
              ? "External payout submitted; awaiting provider."
              : "External payout updated.",
      detail: finalEvaluation.reasons.join("; "),
      internalCodes: ["external_transfer_processed", ...finalEvaluation.reasons]
    });
    auditRecordIds.push(auditRecordId);
    notificationIds.push(notificationId);
  }

  if (finalEvaluation.completed && params.originalExecutionRequestId) {
    await updatePipelineStatusByExecutionDb({
      executionRequestId: params.originalExecutionRequestId,
      status: "pipeline_completed"
    });

    if (sagaId) {
      await updateSagaStatusDb({
        sagaId,
        status: "saga_completed"
      });
    }

    await updateExternalTransferDb({
      externalTransferId: transferId,
      status: "transfer_completed"
    });

    await patchExecutionRequestStatusDb({
      executionRequestId: params.originalExecutionRequestId,
      status: "external_transfer_completed"
    });
  }

  if (finalEvaluation.unknown && params.originalExecutionRequestId) {
    await updatePipelineStatusByExecutionDb({
      executionRequestId: params.originalExecutionRequestId,
      status: "pipeline_failed"
    });

    if (sagaId) {
      await updateSagaStatusDb({
        sagaId,
        status: "saga_failed"
      });
    }

    await updateExternalTransferDb({
      externalTransferId: transferId,
      status: "transfer_requires_review"
    });

    await patchExecutionRequestStatusDb({
      executionRequestId: params.originalExecutionRequestId,
      status: "external_transfer_unknown"
    });
  }

  if (finalEvaluation.compensationRequired && params.originalExecutionRequestId) {
    await patchExecutionRequestStatusDb({
      executionRequestId: params.originalExecutionRequestId,
      status: "external_transfer_compensation_required"
    });
  }

  if (finalEvaluation.unknown || finalEvaluation.requiresReview || finalEvaluation.compensationRequired) {
    await maybeCreateAdminReviewCaseFromHook({
      hookSource: "external_transfer",
      hookTrigger: finalEvaluation.unknown
        ? "external_transfer_unknown"
        : finalEvaluation.compensationRequired
          ? "external_transfer_compensation_required"
          : "external_transfer_requires_review",
      subjectIds: {
        userId: params.userId,
        walletId: params.walletId ?? null,
        externalTransferId: transferId,
        pipelineId: pipelineId ?? null,
        sagaId: sagaId ?? null,
        executionRequestId: params.originalExecutionRequestId ?? null
      },
      sourceObjectType: "external_transfer",
      sourceObjectId: transferId,
      rawEvidence: {
        transfer,
        finalEvaluation,
        providerResult
      } as never,
      publicSummary: "An external transfer needs platform review.",
      internalSummary: "External transfer entered review-worthy state.",
      sourceEventIds: [...initialEventIds, ...finalEventIds],
      riskScore: 1 - finalEvaluation.transferSafetyScore,
      uncertaintyScore: finalEvaluation.unknown ? 0.95 : 0.65,
      userImpactScore: 0.9,
      platformImpactScore: 0.9,
      moneyMovementPossible: true,
      paymentUncertainty: finalEvaluation.unknown,
      fraudSuspected: false,
      userVisible: true,
      existingOpenReviewCaseCount: 0,
      now: new Date().toISOString(),
      metadata: {
        transferStatus: finalEvaluation.status,
        provider
      }
    });
  }

  return {
    transfer,
    evaluation: finalEvaluation,
    providerResult,
    compensation,
    auditRecordIds,
    notificationIds,
    eventIds: [...initialEventIds, ...finalEventIds]
  };
}

/** Merge provider webhook payload into the row (no automatic compensation). */
export async function applyExternalTransferWebhookUpdate(params: {
  externalTransferId: string;
  providerStatus: string;
  providerResponse: Json;
}): Promise<Record<string, unknown> | null> {
  const row = await getExternalTransferDb(params.externalTransferId);
  if (!row) return null;

  return updateExternalTransferDb({
    externalTransferId: params.externalTransferId,
    providerStatus: params.providerStatus,
    providerResponse: params.providerResponse,
    metadata: {
      ...(typeof row.metadata === "object" && row.metadata ? row.metadata : {}),
      lastWebhookAt: new Date().toISOString()
    } as Json
  });
}

/** Poll provider for status (mock returns pending; wire real adapters later). */
export async function pollExternalTransferStatus(params: {
  externalTransferId: string;
  providerAdapter?: ExternalTransferProviderAdapter;
}): Promise<Record<string, unknown> | null> {
  const row = await getExternalTransferDb(params.externalTransferId);
  if (!row) return null;

  const provider = (row.provider as ExternalTransferProvider) ?? "mock";
  const adapter = params.providerAdapter ?? defaultProvider(provider);
  const idempotencyKey = (row.idempotency_key as string | null) ?? "";
  const providerTransferId = row.provider_transfer_id as string | null;
  if (!providerTransferId) return row;

  const result = await adapter.getTransferStatus({
    providerTransferId,
    idempotencyKey
  });

  return updateExternalTransferDb({
    externalTransferId: params.externalTransferId,
    providerStatus: result.providerStatus,
    providerResponse: result.providerResponse,
    metadata: {
      ...(typeof row.metadata === "object" && row.metadata ? row.metadata : {}),
      lastPollAt: new Date().toISOString()
    } as Json
  });
}
