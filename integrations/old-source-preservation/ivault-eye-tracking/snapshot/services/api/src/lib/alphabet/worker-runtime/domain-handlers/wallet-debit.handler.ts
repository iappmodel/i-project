import type { WorkerHandlerContext, WorkerHandlerResult } from "@/types/alphabet/worker-runtime.types";
import { appendLedgerEntryAndUpdateBalanceDb } from "../../db-repositories/ledger-worker.repository";
import { recordFinancialAuditAndNotification } from "../financial-side-effects";

function getPayloadValue<T>(payload: unknown, key: string): T | null {
  if (!payload || typeof payload !== "object") return null;
  return (payload as Record<string, T>)[key] ?? null;
}

export async function walletDebitHandler(
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
        error: "wallet_debit_invalid_payload"
      },
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds: [],
      publicMessage: "Debit could not be completed.",
      internalReasonCodes: ["wallet_debit_invalid_payload"],
      retryable: false
    };
  }

  try {
    const result = await appendLedgerEntryAndUpdateBalanceDb({
      walletId,
      userId,
      coinCode,
      direction: "debit",
      amount,
      sourceType: "execution_request",
      sourceObjectId: context.executionRequest.execution_request_id,
      idempotencyKey: context.executionRequest.idempotency_key,
      dedupeKey: context.executionRequest.dedupe_key,
      reasonCode: getPayloadValue<string>(payload, "reasonCode") ?? "wallet_debit",
      metadata: {
        workerId: context.workerId
      }
    });

    const { auditRecordIds, notificationIds } = await recordFinancialAuditAndNotification({
      handlerName: "wallet.debit",
      executionRequest: context.executionRequest,
      workerId: context.workerId,
      userId,
      publicSummary: "Wallet debited.",
      ledgerEntryIds: [result.ledgerEntry.ledger_entry_id]
    });

    return {
      ok: true,
      status: "completed",
      resultPayload: {
        ledgerEntryId: result.ledgerEntry.ledger_entry_id,
        walletAccountId: result.walletAccount.wallet_account_id,
        balanceAfter: result.walletAccount.available_balance
      },
      ledgerEntryIds: [result.ledgerEntry.ledger_entry_id],
      auditRecordIds,
      notificationIds,
      eventIds: [],
      publicMessage: "Wallet debited.",
      internalReasonCodes: ["wallet_debit_completed"],
      retryable: false
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      resultPayload: {
        error: error instanceof Error ? error.message : "wallet_debit_failed"
      },
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds: [],
      publicMessage: "Debit could not be completed.",
      internalReasonCodes: ["wallet_debit_failed"],
      retryable: false
    };
  }
}
