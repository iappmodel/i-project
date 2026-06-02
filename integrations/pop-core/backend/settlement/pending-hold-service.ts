import type { ProofReviewRecord } from "../review/proof-review-store.js";
import { ProofReviewStateMachine } from "../review/proof-review-state-machine.js";
import {
  createDefaultOfferSettlementTermsProvider,
  type OfferSettlementTermsProvider
} from "./offer-settlement-terms.js";
import {
  toReviewAudit,
  type CreatePendingHoldResult,
  type PendingHoldRecord
} from "./pending-hold.js";
import {
  InMemoryPendingHoldStore,
  type PendingHoldStore
} from "./pending-hold-store.js";
import { computeSettlementAmount } from "./settlement-amount-policy.js";

export interface CreatePendingHoldOptions {
  createdAt?: string;
  store?: PendingHoldStore;
  offerTermsProvider?: OfferSettlementTermsProvider;
  releaseEligibleAt?: string | null;
}

export function createPendingHoldFromReview(
  record: ProofReviewRecord,
  options?: CreatePendingHoldOptions
): CreatePendingHoldResult {
  const store = options?.store ?? new InMemoryPendingHoldStore();

  const existing = store.getBySessionId(record.sessionId);
  if (existing) {
    return {
      outcome: "existing",
      hold: existing,
      sessionId: record.sessionId
    };
  }

  if (record.status !== record.review.status) {
    return {
      outcome: "skipped",
      skipReason: "review_status_mismatch",
      sessionId: record.sessionId
    };
  }

  if (!ProofReviewStateMachine.isSettlementEligible(record.status)) {
    return {
      outcome: "skipped",
      skipReason: "review_not_settlement_eligible",
      sessionId: record.sessionId
    };
  }

  const offerTermsProvider =
    options?.offerTermsProvider ?? createDefaultOfferSettlementTermsProvider();
  const terms = offerTermsProvider.getByOfferId(record.offerId);
  if (!terms) {
    return {
      outcome: "skipped",
      skipReason: "offer_settlement_terms_missing",
      sessionId: record.sessionId
    };
  }

  const amountResult = computeSettlementAmount({ record, terms });
  if (amountResult.computedAmountMinor < 1) {
    return {
      outcome: "skipped",
      skipReason: "settlement_amount_zero",
      sessionId: record.sessionId
    };
  }

  const hold: PendingHoldRecord = {
    sessionId: record.sessionId,
    userId: record.userId,
    localUserRef: record.localUserRef,
    contentId: record.contentId,
    offerId: record.offerId,
    packetId: record.packetId ?? null,
    artifactId: record.artifactId ?? null,
    amount: amountResult.computedAmountMinor,
    amountBreakdown: amountResult.breakdown,
    status: "pending",
    releaseStatus: "not_released",
    createdAt: options?.createdAt ?? new Date().toISOString(),
    reviewAudit: toReviewAudit(record),
    releaseEligibleAt: options?.releaseEligibleAt ?? null,
    reverifyUsed: false
  };

  return {
    outcome: "created",
    hold: store.save(hold),
    sessionId: record.sessionId
  };
}

export class PendingHoldService {
  constructor(private readonly store: PendingHoldStore = new InMemoryPendingHoldStore()) {}

  createPendingHoldFromReview(
    record: ProofReviewRecord,
    options?: Omit<CreatePendingHoldOptions, "store">
  ): CreatePendingHoldResult {
    return createPendingHoldFromReview(record, { ...options, store: this.store });
  }

  getHoldBySessionId(sessionId: string): PendingHoldRecord | null {
    return this.store.getBySessionId(sessionId);
  }
}
