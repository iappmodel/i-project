import type { ProofReviewRecord } from "../review/proof-review-store.js";
import { ProofReviewStateMachine } from "../review/proof-review-state-machine.js";
import {
  toReviewAudit,
  type CreatePendingHoldResult,
  type PendingHoldRecord
} from "./pending-hold.js";
import {
  InMemoryPendingHoldStore,
  type PendingHoldStore
} from "./pending-hold-store.js";

export interface CreatePendingHoldOptions {
  createdAt?: string;
  store?: PendingHoldStore;
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

  const hold: PendingHoldRecord = {
    sessionId: record.sessionId,
    userId: record.userId,
    localUserRef: record.localUserRef,
    contentId: record.contentId,
    offerId: record.offerId,
    packetId: record.packetId ?? null,
    artifactId: record.artifactId ?? null,
    amount: null,
    status: "pending",
    releaseStatus: "not_released",
    createdAt: options?.createdAt ?? new Date().toISOString(),
    reviewAudit: toReviewAudit(record)
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
