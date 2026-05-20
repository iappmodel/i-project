import { createServiceDbClient } from "../db-client";
import { createCompensationForLedgerEntry } from "../compensation/compensation-store";
import { insertAuditRecordDb } from "../db-repositories/audits.repository";
import { updateCompensationRecordDb } from "../db-repositories/compensation.repository";
import { updateExternalTransferDb } from "../db-repositories/external-transfers.repository";
import { insertNotificationRecordDb } from "../db-repositories/notifications.repository";
import { updatePipelineRecordLinksDb } from "../db-repositories/pipelines.repository";
import { getLedgerEntryDb } from "../db-repositories/reversal-ledger.repository";
import { updateSagaStatusDb } from "../db-repositories/saga-worker.repository";
import type { Json } from "@/types/alphabet/database.types";
import type {
  AdminReviewDecision,
  AdminReviewEvaluationResult
} from "@/types/alphabet/admin-review.types";

type ReviewCaseRow = Record<string, unknown>;

function asJson(value: unknown): Json {
  return (value ?? {}) as Json;
}

function rawEvidenceObject(row: ReviewCaseRow): Record<string, unknown> {
  const raw = row.raw_evidence;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export async function applyReviewDecision(params: {
  reviewCase: ReviewCaseRow;
  evaluation: AdminReviewEvaluationResult;
  decision: AdminReviewDecision;
  decidedByUserId: string;
  decisionReasonCodes: string[];
}): Promise<{ appliedActions: string[] }> {
  const db = createServiceDbClient();
  const reviewCase = params.reviewCase;
  const evaluation = params.evaluation;
  const appliedActions: string[] = [];

  await insertAuditRecordDb({
    auditType: "admin_review_decision",
    status: "created",
    userId: (reviewCase.user_id as string | null | undefined) ?? null,
    actorUserId: params.decidedByUserId,
    walletId: (reviewCase.wallet_id as string | null | undefined) ?? null,
    contentId: (reviewCase.content_id as string | null | undefined) ?? null,
    campaignId: (reviewCase.campaign_id as string | null | undefined) ?? null,
    policyDecisionId: (reviewCase.policy_decision_id as string | null | undefined) ?? null,
    executionRequestId: (reviewCase.execution_request_id as string | null | undefined) ?? null,
    sagaId: (reviewCase.saga_id as string | null | undefined) ?? null,
    pipelineId: (reviewCase.pipeline_id as string | null | undefined) ?? null,
    sourceEventIds: (reviewCase.source_event_ids as string[] | undefined) ?? [],
    publicSummary: "A review decision was recorded.",
    internalSummary: "Admin review decision evaluated and applied per governance rules.",
    evidence: {
      reviewCaseId: reviewCase.review_case_id,
      decision: params.decision,
      outcomeStatus: evaluation.status,
      reasonCodes: params.decisionReasonCodes
    } as Json,
    redactedEvidence: {
      reviewCaseId: reviewCase.review_case_id,
      decision: params.decision
    } as Json,
    riskSummary: { evaluation: { status: evaluation.status, reasons: evaluation.reasons } } as Json,
    metadata: { decidedByUserId: params.decidedByUserId } as Json
  });
  appliedActions.push("audit_record_created");

  const notifyUser =
    typeof reviewCase.user_id === "string" &&
    reviewCase.user_id.length > 0 &&
    params.decision !== "escalate";

  const shouldNotify =
    evaluation.notificationRequired &&
    notifyUser &&
    (evaluation.decisionAllowed ||
      evaluation.decisionBlocked ||
      evaluation.requiresMoreInfo ||
      evaluation.canceled);

  if (shouldNotify) {
    await insertNotificationRecordDb({
      recipientUserId: reviewCase.user_id as string,
      sourceSystem: "admin_review",
      sourceObjectId: reviewCase.review_case_id as string,
      sourceEventIds: (reviewCase.source_event_ids as string[] | undefined) ?? [],
      category: "review",
      severity: params.decision === "reject_block" ? "warning" : "info",
      status: "created",
      title: "Review update",
      body: "A review decision was recorded for your account or action.",
      explanationClass: "admin_review_decision",
      objectLabel: "review",
      internalReasonCodes: params.decisionReasonCodes,
      privacySensitivity: "medium",
      dedupeKey: `review:${String(reviewCase.review_case_id)}:${params.decision}`,
      metadata: { decision: params.decision, outcomeStatus: evaluation.status } as Json
    });
    appliedActions.push("notification_created");
  }

  if (evaluation.canceled) {
    appliedActions.push("downstream_skipped_canceled");
    return { appliedActions };
  }

  if (evaluation.escalationRequired) {
    appliedActions.push("downstream_skipped_escalation");
    return { appliedActions };
  }

  if (evaluation.requiresMoreInfo && params.decision === "request_more_info") {
    appliedActions.push("downstream_skipped_more_info");
    return { appliedActions };
  }

  if (!evaluation.decisionAllowed && !evaluation.decisionBlocked) {
    appliedActions.push("downstream_skipped_outcome");
    return { appliedActions };
  }

  const policyId = reviewCase.policy_decision_id as string | null | undefined;
  const pipelineId = reviewCase.pipeline_id as string | null | undefined;
  const externalTransferId = reviewCase.external_transfer_id as string | null | undefined;
  const compensationId = reviewCase.compensation_id as string | null | undefined;
  const walletId = reviewCase.wallet_id as string | null | undefined;
  const campaignId = reviewCase.campaign_id as string | null | undefined;
  const sagaId = reviewCase.saga_id as string | null | undefined;

  const approveFamily =
    params.decision === "approve_continue" ||
    params.decision === "approve_with_limits" ||
    params.decision === "release_hold";

  if (approveFamily && evaluation.decisionAllowed) {
    if (policyId) {
      await db
        .from("policy_decisions")
        .update({
          status: "policy_allowed",
          decision: params.decision === "approve_with_limits" ? "allow_with_limits" : "allow",
          updated_at: new Date().toISOString()
        })
        .eq("policy_decision_id", policyId);
      appliedActions.push("policy_allowed_after_review");
    }

    if (pipelineId) {
      await updatePipelineRecordLinksDb({
        pipelineId,
        status: "pipeline_ready"
      });
      appliedActions.push("pipeline_ready");
    }

    if (externalTransferId) {
      await updateExternalTransferDb({
        externalTransferId,
        status: "transfer_ready"
      });
      appliedActions.push("external_transfer_ready");
    }

    if (sagaId) {
      await updateSagaStatusDb({ sagaId, status: "saga_ready" });
      appliedActions.push("saga_ready");
    }
  }

  if (params.decision === "reject_block" && evaluation.decisionBlocked) {
    if (pipelineId) {
      await updatePipelineRecordLinksDb({
        pipelineId,
        status: "pipeline_failed"
      });
      appliedActions.push("pipeline_failed");
    }

    if (externalTransferId) {
      await updateExternalTransferDb({
        externalTransferId,
        status: "transfer_failed"
      });
      appliedActions.push("external_transfer_failed");
    }

    if (compensationId) {
      await updateCompensationRecordDb({
        compensationId,
        status: "compensation_blocked"
      });
      appliedActions.push("compensation_blocked");
    }

    if (sagaId) {
      await updateSagaStatusDb({ sagaId, status: "saga_failed" });
      appliedActions.push("saga_failed");
    }
  }

  if (
    (params.decision === "freeze_wallet" || params.decision === "freeze_withdrawals") &&
    evaluation.decisionAllowed &&
    walletId
  ) {
    const status =
      params.decision === "freeze_wallet" ? "frozen" : "withdrawals_frozen";
    await db
      .from("wallets")
      .update({
        wallet_status: status,
        frozen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("wallet_id", walletId);
    appliedActions.push(params.decision);
  }

  if (params.decision === "freeze_campaign" && evaluation.decisionAllowed && campaignId) {
    await db
      .from("pipeline_records")
      .update({
        status: "campaign_frozen_by_review",
        updated_at: new Date().toISOString()
      })
      .eq("campaign_id", campaignId);
    appliedActions.push("campaign_frozen");
  }

  if (params.decision === "reverse_and_compensate" && evaluation.decisionAllowed) {
    const evidence = rawEvidenceObject(reviewCase);
    const originalLedgerEntryId =
      (typeof evidence.originalLedgerEntryId === "string" && evidence.originalLedgerEntryId) ||
      (typeof evidence.original_ledger_entry_id === "string" && evidence.original_ledger_entry_id) ||
      undefined;

    if (originalLedgerEntryId) {
      const original = await getLedgerEntryDb(originalLedgerEntryId);
      if (original) {
        const compensationRow = await createCompensationForLedgerEntry({
          originalLedgerEntryId,
          compensationType: "manual_admin_compensation",
          triggerType: "admin_reversal",
          amount: Number(original.amount),
          coinCode: String(original.coin_code),
          originalUserId: String(original.user_id),
          originalWalletId: original.wallet_id != null ? String(original.wallet_id) : null,
          originalWalletAccountId:
            original.wallet_account_id != null ? String(original.wallet_account_id) : null,
          originalExecutionRequestId: null,
          originalSagaId: (reviewCase.saga_id as string | null) ?? null,
          originalPipelineId: (reviewCase.pipeline_id as string | null) ?? null,
          idempotencyKey: `admin-comp:${String(reviewCase.review_case_id)}`,
          dedupeKey: `admin-comp:${originalLedgerEntryId}`,
          reasonCodes: params.decisionReasonCodes,
          requiresReview: false,
          reviewApproved: true,
          externalTransferMayHaveStarted: Boolean(evidence.externalTransferMayHaveStarted),
          externalTransferConfirmedFailed: Boolean(evidence.externalTransferConfirmedFailed),
          sourceEventIds: (reviewCase.source_event_ids as string[] | undefined) ?? [],
          actorUserId: params.decidedByUserId,
          metadata: asJson({
            reviewCaseId: reviewCase.review_case_id,
            fromAdminReview: true
          })
        });
        const compId =
          compensationRow &&
          typeof compensationRow === "object" &&
          "compensation_id" in compensationRow
            ? String((compensationRow as { compensation_id: string }).compensation_id)
            : "";
        appliedActions.push(`compensation_created:${compId}`);
      } else {
        appliedActions.push("compensation_skipped_ledger_not_found");
      }
    } else {
      appliedActions.push("compensation_skipped_no_ledger_reference");
    }
  }

  return { appliedActions };
}
