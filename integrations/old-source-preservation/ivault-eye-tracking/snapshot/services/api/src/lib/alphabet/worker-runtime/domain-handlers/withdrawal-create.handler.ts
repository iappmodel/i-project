import type { WorkerHandlerContext, WorkerHandlerResult } from "@/types/alphabet/worker-runtime.types";
import { appendLedgerEntryAndUpdateBalanceDb } from "../../db-repositories/ledger-worker.repository";
import { recordFinancialAuditAndNotification } from "../financial-side-effects";
import { createAndProcessExternalTransfer } from "../../external-transfer/external-transfer-store";

function getPayloadValue<T>(payload: unknown, key: string): T | null {
  if (!payload || typeof payload !== "object") return null;
  return (payload as Record<string, T>)[key] ?? null;
}

function metaIds(executionMeta: unknown): { pipelineId: string | null; sagaId: string | null } {
  return {
    pipelineId:
      getPayloadValue<string>(executionMeta, "pipelineId") ??
      getPayloadValue<string>(executionMeta, "pipeline_id") ??
      null,
    sagaId:
      getPayloadValue<string>(executionMeta, "sagaId") ??
      getPayloadValue<string>(executionMeta, "saga_id") ??
      null
  };
}

export async function withdrawalCreateHandler(
  context: WorkerHandlerContext
): Promise<WorkerHandlerResult> {
  const payload = context.executionRequest.sanitized_payload;

  const walletId = getPayloadValue<string>(payload, "walletId");
  const userId = getPayloadValue<string>(payload, "userId");
  const coinCode = getPayloadValue<string>(payload, "coinCode");
  const amount = getPayloadValue<number>(payload, "amount");

  if (!walletId || !userId || !coinCode || !amount || amount <= 0) {
    return {
      ok: false,
      status: "failed",
      resultPayload: {
        error: "withdrawal_invalid_payload"
      },
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds: [],
      publicMessage: "Withdrawal could not be created.",
      internalReasonCodes: ["withdrawal_invalid_payload"],
      retryable: false
    };
  }

  try {
    const debit = await appendLedgerEntryAndUpdateBalanceDb({
      walletId,
      userId,
      coinCode,
      direction: "debit",
      amount,
      sourceType: "withdrawal_request",
      sourceObjectId: context.executionRequest.execution_request_id,
      idempotencyKey: context.executionRequest.idempotency_key,
      dedupeKey: context.executionRequest.dedupe_key,
      reasonCode: "withdrawal_debit",
      metadata: {
        workerId: context.workerId,
        withdrawalStatus: "created_internal_only",
        externalTransferStarted: false
      }
    });

    const { auditRecordIds, notificationIds } = await recordFinancialAuditAndNotification({
      handlerName: "withdrawal.create",
      executionRequest: context.executionRequest,
      workerId: context.workerId,
      userId,
      publicSummary: "Withdrawal initiated (internal ledger debit posted).",
      ledgerEntryIds: [debit.ledgerEntry.ledger_entry_id]
    });

    const { pipelineId, sagaId } = metaIds(context.executionRequest.metadata);

    const externalTransfer = await createAndProcessExternalTransfer({
      transferType: "withdrawal_payout",
      provider: "mock",
      userId,
      walletId,
      walletAccountId: debit.walletAccount.wallet_account_id,
      originalExecutionRequestId: context.executionRequest.execution_request_id,
      originalLedgerEntryId: debit.ledgerEntry.ledger_entry_id,
      pipelineId,
      sagaId,
      amount,
      coinCode,
      fiatAmount: amount,
      fiatCurrency: "USD",
      destinationType: "stored_payout_destination",
      destinationLabel:
        getPayloadValue<string>(payload, "destinationLabel") ?? "Default payout destination",
      idempotencyKey: `${context.executionRequest.idempotency_key ?? "withdrawal"}:external_transfer`,
      dedupeKey: `${context.executionRequest.dedupe_key ?? "withdrawal"}:external_transfer`,
      sourceEventIds: context.executionRequest.source_event_ids,
      reviewApproved: false,
      recordSideEffects: {
        executionRequest: context.executionRequest,
        workerId: context.workerId
      },
      metadata: {
        workerId: context.workerId,
        pipelineId,
        sagaId,
        mockStatus: getPayloadValue<string>(payload, "mockExternalTransferStatus") ?? "pending"
      }
    });

    return {
      ok: true,
      status: "completed",
      resultPayload: {
        withdrawalId: `withdrawal_${context.executionRequest.execution_request_id}`,
        status: "created",
        ledgerEntryId: debit.ledgerEntry.ledger_entry_id,
        externalTransferId: externalTransfer.transfer.external_transfer_id,
        externalTransferStatus: externalTransfer.evaluation.status,
        balanceAfter: debit.walletAccount.available_balance
      },
      ledgerEntryIds: [debit.ledgerEntry.ledger_entry_id],
      auditRecordIds: [...auditRecordIds, ...externalTransfer.auditRecordIds],
      notificationIds: [...notificationIds, ...externalTransfer.notificationIds],
      eventIds: externalTransfer.eventIds,
      publicMessage: "Withdrawal created.",
      internalReasonCodes: [
        "withdrawal_created_internal_debit_posted",
        ...externalTransfer.evaluation.reasons
      ],
      retryable: false
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      resultPayload: {
        error: error instanceof Error ? error.message : "withdrawal_failed"
      },
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds: [],
      publicMessage: "Withdrawal failed.",
      internalReasonCodes: ["withdrawal_failed_no_external_transfer_started"],
      retryable: false
    };
  }
}
