import type { PendingHoldRecord } from "./pending-hold.js";
import type { SettlementAmountBreakdown } from "./settlement-amount.types.js";

export const PENDING_HOLD_RELEASE_ELIGIBILITY_REASON = {
  AMOUNT_MISSING: "amount_missing",
  AMOUNT_ZERO: "amount_zero",
  AMOUNT_BREAKDOWN_MISSING: "amount_breakdown_missing",
  AMOUNT_BREAKDOWN_MISMATCH: "amount_breakdown_mismatch",
  OFFER_ID_MISMATCH: "offer_id_mismatch",
  HOLD_NOT_PENDING: "hold_not_pending",
  HOLD_CONTEXT_REQUIRED: "hold_context_required"
} as const;

export type PendingHoldReleaseEligibilityReason =
  (typeof PENDING_HOLD_RELEASE_ELIGIBILITY_REASON)[keyof typeof PENDING_HOLD_RELEASE_ELIGIBILITY_REASON];

export class PendingHoldReleaseEligibilityError extends Error {
  readonly sessionId: string;
  readonly reasonCodes: PendingHoldReleaseEligibilityReason[];

  constructor(sessionId: string, reasonCodes: PendingHoldReleaseEligibilityReason[]) {
    super(
      `Pending hold release eligibility failed for sessionId: ${sessionId} (${reasonCodes.join(", ")})`
    );
    this.name = "PendingHoldReleaseEligibilityError";
    this.sessionId = sessionId;
    this.reasonCodes = reasonCodes;
  }
}

export function isReleaseAmountConsistent(
  hold: Pick<PendingHoldRecord, "amount" | "amountBreakdown" | "offerId">
): boolean {
  const { amount, amountBreakdown, offerId } = hold;

  if (amount === null || amountBreakdown === null) {
    return false;
  }

  if (amount !== amountBreakdown.computedAmountMinor) {
    return false;
  }

  if (amountBreakdown.offerId !== offerId) {
    return false;
  }

  return true;
}

export function collectReleaseEligibilityReasons(
  hold: PendingHoldRecord
): PendingHoldReleaseEligibilityReason[] {
  const reasons: PendingHoldReleaseEligibilityReason[] = [];

  if (hold.status !== "pending") {
    reasons.push(PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.HOLD_NOT_PENDING);
  }

  if (hold.amount === null) {
    reasons.push(PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_MISSING);
  } else if (hold.amount < 1) {
    reasons.push(PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_ZERO);
  }

  if (hold.amountBreakdown === null) {
    reasons.push(PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_BREAKDOWN_MISSING);
  } else if (hold.amount !== null && hold.amount !== hold.amountBreakdown.computedAmountMinor) {
    reasons.push(PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_BREAKDOWN_MISMATCH);
  } else if (
    hold.amountBreakdown !== null &&
    hold.amountBreakdown.offerId !== hold.offerId
  ) {
    reasons.push(PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.OFFER_ID_MISMATCH);
  }

  return reasons;
}

export function isReleaseEligible(hold: PendingHoldRecord): boolean {
  return collectReleaseEligibilityReasons(hold).length === 0;
}

export function assertReleaseEligible(hold: PendingHoldRecord): void {
  const reasonCodes = collectReleaseEligibilityReasons(hold);
  if (reasonCodes.length > 0) {
    throw new PendingHoldReleaseEligibilityError(hold.sessionId, reasonCodes);
  }
}
