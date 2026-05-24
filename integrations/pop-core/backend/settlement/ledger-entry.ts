import {
  RELEASE_EXECUTION_BOUNDARY_V1,
  type ReleaseExecutionRecord
} from "./release-execution.js";
import type { SettlementCurrency } from "./settlement-amount.constants.js";
import type { SettlementAmountBreakdown } from "./settlement-amount.types.js";

export const LEDGER_BOUNDARY_V1 = "LEDGER_BOUNDARY_V1" as const;

export type LedgerBoundaryVersion = typeof LEDGER_BOUNDARY_V1;

export type LedgerEntryStatus = "pending_wallet_credit";

export type LedgerEntryDirection = "credit";

export type LedgerEntryType = "hold_release_credit";

export interface LedgerEntry {
  boundaryVersion: LedgerBoundaryVersion;
  ledgerEntryId: string;
  sourceRef: string;
  sessionId: string;
  offerId: string;
  direction: LedgerEntryDirection;
  entryType: LedgerEntryType;
  amount: number;
  currency: SettlementCurrency;
  amountBreakdown: SettlementAmountBreakdown;
  status: LedgerEntryStatus;
  sourceExecutedAt: string;
  postedAt: string;
}

export interface BuildLedgerCreditEntryOptions {
  postedAt?: string;
}

export function deriveLedgerEntryId(executionRef: string): string {
  return `ledger_credit_${executionRef}`;
}

export function buildLedgerCreditEntryFromReleaseExecution(
  execution: ReleaseExecutionRecord,
  options?: BuildLedgerCreditEntryOptions
): LedgerEntry {
  if (execution.boundaryVersion !== RELEASE_EXECUTION_BOUNDARY_V1) {
    throw new Error(
      `buildLedgerCreditEntryFromReleaseExecution requires boundaryVersion ${RELEASE_EXECUTION_BOUNDARY_V1}`
    );
  }

  if (execution.releaseStatus !== "released") {
    throw new Error('buildLedgerCreditEntryFromReleaseExecution requires releaseStatus "released"');
  }

  if (!execution.executionRef || execution.executionRef.trim().length === 0) {
    throw new Error("buildLedgerCreditEntryFromReleaseExecution requires a non-empty executionRef");
  }

  if (execution.amount < 1) {
    throw new Error("buildLedgerCreditEntryFromReleaseExecution requires amount >= 1");
  }

  const postedAt = options?.postedAt ?? execution.executedAt;

  return {
    boundaryVersion: LEDGER_BOUNDARY_V1,
    ledgerEntryId: deriveLedgerEntryId(execution.executionRef),
    sourceRef: execution.executionRef,
    sessionId: execution.sessionId,
    offerId: execution.offerId,
    direction: "credit",
    entryType: "hold_release_credit",
    amount: execution.amount,
    currency: execution.currency,
    amountBreakdown: { ...execution.amountBreakdown },
    status: "pending_wallet_credit",
    sourceExecutedAt: execution.executedAt,
    postedAt
  };
}
