import type { WorkerHandlerContext, WorkerHandlerResult } from "@/types/alphabet/worker-runtime.types";
import {
  appendLedgerEntryAndUpdateBalanceDb,
  createValueLotForCreditDb,
  findValueLotBySourceLedgerEntryDb
} from "../../db-repositories/ledger-worker.repository";
import { recordFinancialAuditAndNotification } from "../financial-side-effects";

function getPayloadValue<T>(payload: unknown, key: string): T | null {
  if (!payload || typeof payload !== "object") return null;
  return (payload as Record<string, T>)[key] ?? null;
}

export async function walletCreditHandler(
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
        error: "wallet_credit_invalid_payload"
      },
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds: [],
      publicMessage: "Credit could not be completed.",
      internalReasonCodes: ["wallet_credit_invalid_payload"],
      retryable: false
    };
  }

  const result = await appendLedgerEntryAndUpdateBalanceDb({
    walletId,
    userId,
    coinCode,
    direction: "credit",
    amount,
    sourceType: "execution_request",
    sourceObjectId: context.executionRequest.execution_request_id,
    idempotencyKey: context.executionRequest.idempotency_key,
    dedupeKey: context.executionRequest.dedupe_key,
    reasonCode: getPayloadValue<string>(payload, "reasonCode") ?? "wallet_credit",
    metadata: {
      workerId: context.workerId
    }
  });

  let valueLot = await findValueLotBySourceLedgerEntryDb({
    sourceLedgerEntryId: result.ledgerEntry.ledger_entry_id
  });

  if (!valueLot) {
    valueLot = await createValueLotForCreditDb({
      walletId,
      walletAccountId: result.walletAccount.wallet_account_id,
      userId,
      coinCode,
      amount,
      sourceLedgerEntryId: result.ledgerEntry.ledger_entry_id,
      metadata: {
        workerId: context.workerId
      }
    });
  }

  const { auditRecordIds, notificationIds } = await recordFinancialAuditAndNotification({
    handlerName: "wallet.credit",
    executionRequest: context.executionRequest,
    workerId: context.workerId,
    userId,
    publicSummary: "Wallet credited.",
    ledgerEntryIds: [result.ledgerEntry.ledger_entry_id]
  });

  return {
    ok: true,
    status: "completed",
    resultPayload: {
      ledgerEntryId: result.ledgerEntry.ledger_entry_id,
      walletAccountId: result.walletAccount.wallet_account_id,
      valueLotId: valueLot.value_lot_id,
      balanceAfter: result.walletAccount.available_balance
    },
    ledgerEntryIds: [result.ledgerEntry.ledger_entry_id],
    auditRecordIds,
    notificationIds,
    eventIds: [],
    publicMessage: "Wallet credited.",
    internalReasonCodes: ["wallet_credit_completed"],
    retryable: false
  };
}
