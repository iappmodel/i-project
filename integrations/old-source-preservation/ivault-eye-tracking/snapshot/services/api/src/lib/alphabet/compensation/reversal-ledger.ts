import { appendReversalLedgerEntryDb } from "../db-repositories/reversal-ledger.repository";

export async function appendReversalLedgerEntry(params: {
  compensationId: string;
  originalLedgerEntryId: string;
  amount: number;
  idempotencyKey: string;
  dedupeKey: string;
  reasonCode: string;
  metadata?: Record<string, unknown>;
}) {
  return appendReversalLedgerEntryDb({
    originalLedgerEntryId: params.originalLedgerEntryId,
    amount: params.amount,
    idempotencyKey: params.idempotencyKey,
    dedupeKey: params.dedupeKey,
    reasonCode: params.reasonCode,
    metadata: {
      compensationId: params.compensationId,
      ...params.metadata
    }
  });
}
