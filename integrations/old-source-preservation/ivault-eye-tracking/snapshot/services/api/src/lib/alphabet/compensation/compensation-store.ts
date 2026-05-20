import { insertCompensationRecordDb } from "../db-repositories/compensation.repository";
import type { CompensationTrigger, CompensationType } from "@/types/alphabet/compensation.types";
import type { Json } from "@/types/alphabet/database.types";
import { maybeCreateAdminReviewCaseFromHook } from "../admin-review-hooks/admin-review-hook-store";

export interface CreateCompensationForLedgerEntryParams {
  originalLedgerEntryId: string;
  compensationType: CompensationType;
  triggerType: CompensationTrigger;
  amount: number;
  coinCode: string;
  originalUserId: string;
  originalWalletId?: string | null;
  originalWalletAccountId?: string | null;
  originalExecutionRequestId?: string | null;
  originalSagaId?: string | null;
  originalPipelineId?: string | null;
  idempotencyKey: string;
  dedupeKey: string;
  reasonCodes: string[];
  requiresReview: boolean;
  reviewApproved: boolean;
  externalTransferMayHaveStarted: boolean;
  externalTransferConfirmedFailed: boolean;
  sourceEventIds?: string[];
  metadata?: Json;
  actorUserId?: string | null;
}

/**
 * Persists a compensation intent row after confirmed external payout failure (or similar).
 * Does not post reversal ledger lines — downstream workers consume this record.
 */
export async function createCompensationForLedgerEntry(
  params: CreateCompensationForLedgerEntryParams
): Promise<Record<string, unknown>> {
  const status = params.requiresReview && !params.reviewApproved
    ? "compensation_requires_review"
    : "compensation_created";

  const safetyScores = {
    originalMutationConfidence: params.externalTransferConfirmedFailed ? 0.95 : 0.5,
    reversalEligibilityScore: params.externalTransferConfirmedFailed ? 0.92 : 0.4,
    reversalSafetyScore: params.externalTransferMayHaveStarted ? 0.55 : 0.92,
    compensationUrgencyScore: 0.85,
    compensationFraudRisk: 0.05,
    compensationAuditScore: 0.9
  };

  const record = await insertCompensationRecordDb({
    compensationType: params.compensationType,
    triggerType: params.triggerType,
    status,
    originalExecutionRequestId: params.originalExecutionRequestId ?? null,
    originalLedgerEntryId: params.originalLedgerEntryId,
    originalSagaId: params.originalSagaId ?? null,
    originalPipelineId: params.originalPipelineId ?? null,
    originalPolicyDecisionId: null,
    originalWalletId: params.originalWalletId ?? null,
    originalWalletAccountId: params.originalWalletAccountId ?? null,
    originalUserId: params.originalUserId,
    amount: params.amount,
    coinCode: params.coinCode,
    originalDirection: "debit",
    reversalDirection: "credit",
    idempotencyKey: params.idempotencyKey,
    dedupeKey: params.dedupeKey,
    sourceEventIds: params.sourceEventIds ?? [],
    reasonCodes: params.reasonCodes,
    requiresReview: params.requiresReview,
    actorUserId: params.actorUserId ?? null,
    safetyScores: safetyScores as Json,
    metadata: {
      reviewApproved: params.reviewApproved,
      externalTransferMayHaveStarted: params.externalTransferMayHaveStarted,
      externalTransferConfirmedFailed: params.externalTransferConfirmedFailed,
      ...(params.metadata as Record<string, unknown>)
    } as Json
  });

  const compensationId = record.compensation_id as string;
  const eventIds = (record.source_event_ids as string[] | undefined) ?? params.sourceEventIds ?? [];
  const compensationSafetyScore = Number(
    (safetyScores as { reversalSafetyScore?: number }).reversalSafetyScore ?? 0.5
  );

  if (status === "compensation_requires_review") {
    await maybeCreateAdminReviewCaseFromHook({
      hookSource: "compensation",
      hookTrigger: "compensation_requires_review",
      subjectIds: {
        userId: params.originalUserId,
        walletId: params.originalWalletId ?? null,
        compensationId,
        executionRequestId: params.originalExecutionRequestId ?? null,
        pipelineId: params.originalPipelineId ?? null,
        sagaId: params.originalSagaId ?? null
      },
      sourceObjectType: "compensation",
      sourceObjectId: compensationId,
      rawEvidence: {
        compensationRecord: record,
        createParams: params
      } as never,
      publicSummary: "A compensation action needs review.",
      internalSummary: "Compensation engine required review before reversal.",
      sourceEventIds: eventIds,
      riskScore: 1 - compensationSafetyScore,
      uncertaintyScore: 0.75,
      userImpactScore: 0.8,
      platformImpactScore: 0.8,
      moneyMovementPossible: true,
      paymentUncertainty: false,
      fraudSuspected: params.reasonCodes.some((reason) => reason.toLowerCase().includes("fraud")),
      userVisible: true,
      existingOpenReviewCaseCount: 0,
      now: new Date().toISOString(),
      metadata: {
        compensationStatus: status
      }
    });
  }

  return record;
}
