import type { PendingHoldRecord } from "./pending-hold.js";
import type { PendingHoldReleaseLifecycleEvent } from "./pending-hold-release-lifecycle.types.js";
import type { PendingHoldReleaseState } from "./pending-hold-release-lifecycle.types.js";
import type { SettlementCurrency } from "./settlement-amount.constants.js";
import type { SettlementAmountBreakdown } from "./settlement-amount.types.js";

export const RELEASE_EXECUTION_BOUNDARY_V1 = "RELEASE_EXECUTION_BOUNDARY_V1" as const;

export type ReleaseExecutionBoundaryVersion = typeof RELEASE_EXECUTION_BOUNDARY_V1;

export interface ReleaseExecutionRecord {
  boundaryVersion: ReleaseExecutionBoundaryVersion;
  executionRef: string;
  sessionId: string;
  offerId: string;
  amount: number;
  currency: SettlementCurrency;
  amountBreakdown: SettlementAmountBreakdown;
  releaseStatus: "released";
  releaseLifecycleEvents: PendingHoldReleaseLifecycleEvent[];
  executedAt: string;
}

export interface BuildReleaseExecutionRecordInput {
  hold: Pick<PendingHoldRecord, "sessionId" | "offerId" | "amount" | "amountBreakdown">;
  executionRef: string;
  releaseLifecycleEvents: PendingHoldReleaseLifecycleEvent[];
  executedAt: string;
}

export function deriveReleaseExecutionRef(
  hold: Pick<PendingHoldRecord, "sessionId" | "amount" | "amountBreakdown">
): string {
  if (hold.amount === null || hold.amountBreakdown === null) {
    throw new Error("deriveReleaseExecutionRef requires non-null amount and amountBreakdown");
  }

  return `release_${hold.sessionId}_${hold.amount}_${hold.amountBreakdown.policyVersion}`;
}

export function buildReleaseExecutionRecord(
  input: BuildReleaseExecutionRecordInput
): ReleaseExecutionRecord {
  const { hold, executionRef, releaseLifecycleEvents, executedAt } = input;

  if (hold.amount === null || hold.amountBreakdown === null) {
    throw new Error("buildReleaseExecutionRecord requires non-null amount and amountBreakdown");
  }

  if (hold.amount < 1) {
    throw new Error("buildReleaseExecutionRecord requires amount >= 1");
  }

  if (hold.amount !== hold.amountBreakdown.computedAmountMinor) {
    throw new Error("buildReleaseExecutionRecord requires amount to match amountBreakdown.computedAmountMinor");
  }

  if (hold.amountBreakdown.offerId !== hold.offerId) {
    throw new Error("buildReleaseExecutionRecord requires amountBreakdown.offerId to match hold.offerId");
  }

  if (!executionRef || executionRef.trim().length === 0) {
    throw new Error("buildReleaseExecutionRecord requires a non-empty executionRef");
  }

  return {
    boundaryVersion: RELEASE_EXECUTION_BOUNDARY_V1,
    executionRef,
    sessionId: hold.sessionId,
    offerId: hold.offerId,
    amount: hold.amount,
    currency: hold.amountBreakdown.currency,
    amountBreakdown: { ...hold.amountBreakdown },
    releaseStatus: "released",
    releaseLifecycleEvents: [...releaseLifecycleEvents],
    executedAt
  };
}

export function releaseStateFromExecutionRecord(
  record: ReleaseExecutionRecord
): PendingHoldReleaseState {
  return {
    releaseStatus: record.releaseStatus,
    releaseLifecycleEvents: [...record.releaseLifecycleEvents]
  };
}
