import type { ProofReviewStatus } from "../types/proof-packet-v0.types.js";
import type { ProofReviewRecord } from "../review/proof-review-store.js";
import type { SettlementAmountBreakdown } from "./settlement-amount.types.js";

export type PendingHoldStatus = "pending" | "appeal_pending";
export type PendingHoldReleaseStatus =
  | "not_released"
  | "release_ready"
  | "release_blocked"
  | "released"
  | "cancelled";

export type PendingHoldSkipReason =
  | "review_not_settlement_eligible"
  | "review_status_mismatch"
  | "offer_settlement_terms_missing"
  | "settlement_amount_zero"
  | "not_appeal_review_status";

export interface PendingHoldReviewAudit {
  sessionId: string;
  reviewedAt: string;
  reviewStatus: ProofReviewStatus;
  artifactId?: string | null;
  packetId?: string | null;
  lifecycleEventCount: number;
}

export interface PendingHoldRecord {
  sessionId: string;
  userId?: string | null;
  localUserRef: string;
  contentId: string;
  offerId: string;
  packetId?: string | null;
  artifactId?: string | null;
  amount: number | null;
  amountBreakdown: SettlementAmountBreakdown | null;
  status: PendingHoldStatus;
  releaseStatus: PendingHoldReleaseStatus;
  createdAt: string;
  reviewAudit: PendingHoldReviewAudit;
  /** When settlement may be released (approved/partial only). */
  releaseEligibleAt?: string | null;
  /** Appeal window end for pending/escalated holds. */
  appealExpiresAt?: string | null;
  /** One re-verification attempt allowed before forfeit. */
  reverifyUsed?: boolean;
}

export type CreatePendingHoldOutcome = "created" | "existing" | "skipped";

export interface CreatePendingHoldResult {
  outcome: CreatePendingHoldOutcome;
  hold?: PendingHoldRecord;
  skipReason?: PendingHoldSkipReason;
  sessionId: string;
}

export function normalizePendingHoldRecord(record: PendingHoldRecord): PendingHoldRecord {
  return {
    ...record,
    releaseEligibleAt: record.releaseEligibleAt ?? null,
    appealExpiresAt: record.appealExpiresAt ?? null,
    reverifyUsed: record.reverifyUsed ?? false
  };
}

export function toReviewAudit(record: ProofReviewRecord): PendingHoldReviewAudit {
  return {
    sessionId: record.sessionId,
    reviewedAt: record.reviewedAt,
    reviewStatus: record.status,
    artifactId: record.artifactId ?? null,
    packetId: record.packetId ?? null,
    lifecycleEventCount: record.lifecycleEvents.length
  };
}
