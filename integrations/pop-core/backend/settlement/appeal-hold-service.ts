import type { ProofReviewRecord } from "../review/proof-review-store.js";
import {
  createDefaultOfferSettlementTermsProvider,
  type OfferSettlementTermsProvider
} from "./offer-settlement-terms.js";
import {
  toReviewAudit,
  type CreatePendingHoldResult,
  type PendingHoldRecord
} from "./pending-hold.js";
import type { PendingHoldStore } from "./pending-hold-store.js";
import { InMemoryPendingHoldStore } from "./pending-hold-store.js";

/** Nominal hold amount while review is pending/escalated (not settlement-eligible). */
export const APPEAL_PLACEHOLDER_AMOUNT_MINOR = 1;

export interface AppealHoldOptions {
  createdAt?: string;
  appealExpiresAt?: string;
  store?: PendingHoldStore;
  offerTermsProvider?: OfferSettlementTermsProvider;
}

/**
 * Creates a non-settleable appeal hold for pending/escalated reviews.
 * Never auto-pays; user may re-verify once before [appealExpiresAt].
 */
export function createAppealHoldFromReview(
  record: ProofReviewRecord,
  options?: AppealHoldOptions
): CreatePendingHoldResult {
  const store = options?.store ?? new InMemoryPendingHoldStore();
  const status = record.status;

  if (status !== "pending" && status !== "escalated") {
    return {
      outcome: "skipped",
      skipReason: "not_appeal_review_status",
      sessionId: record.sessionId
    };
  }

  const existing = store.getBySessionId(record.sessionId);
  if (existing) {
    return {
      outcome: "existing",
      hold: existing,
      sessionId: record.sessionId
    };
  }

  const offerTermsProvider =
    options?.offerTermsProvider ?? createDefaultOfferSettlementTermsProvider();
  const terms = offerTermsProvider.getByOfferId(record.offerId);
  const currency = terms?.currency ?? "ICOIN";

  const hold: PendingHoldRecord = {
    sessionId: record.sessionId,
    userId: record.userId,
    localUserRef: record.localUserRef,
    contentId: record.contentId,
    offerId: record.offerId,
    packetId: record.packetId ?? null,
    artifactId: record.artifactId ?? null,
    amount: APPEAL_PLACEHOLDER_AMOUNT_MINOR,
    amountBreakdown: {
      policyVersion: "APPEAL_HOLD_V1",
      currency,
      offerId: record.offerId,
      baseRewardMinor: terms?.baseRewardMinor ?? APPEAL_PLACEHOLDER_AMOUNT_MINOR,
      statusMultiplier: 0,
      computedAmountMinor: APPEAL_PLACEHOLDER_AMOUNT_MINOR,
      presenceUnits: null
    },
    status: "appeal_pending",
    releaseStatus: "release_blocked",
    createdAt: options?.createdAt ?? new Date().toISOString(),
    reviewAudit: toReviewAudit(record),
    appealExpiresAt: options?.appealExpiresAt,
    reverifyUsed: false
  };

  return {
    outcome: "created",
    hold: store.save(hold),
    sessionId: record.sessionId
  };
}
