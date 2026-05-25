import { describe, expect, it } from "vitest";
import { ProofReviewService } from "../../review/proof-review-service.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import {
  DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  DEFAULT_FIXTURE_OFFER_ID,
  DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS,
  InMemoryOfferSettlementTermsProvider
} from "../../settlement/offer-settlement-terms.js";
import {
  createPendingHoldFromReview,
  PendingHoldService
} from "../../settlement/pending-hold-service.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import {
  SETTLEMENT_AMOUNT_POLICY_V1,
  SETTLEMENT_APPROVED_MULTIPLIER_V1,
  SETTLEMENT_CURRENCY_V1,
  SETTLEMENT_PARTIAL_MULTIPLIER_V1
} from "../../settlement/settlement-amount.constants.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";
import { buildProofReviewRecord } from "../review/proof-review-store.contract.js";
import { buildPartialProofReviewRecord } from "./pending-hold-store.contract.js";

const approvedAmountBreakdown = {
  policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
  currency: SETTLEMENT_CURRENCY_V1,
  offerId: DEFAULT_FIXTURE_OFFER_ID,
  baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  statusMultiplier: SETTLEMENT_APPROVED_MULTIPLIER_V1,
  computedAmountMinor: 100,
  presenceUnits: null
};

describe("createPendingHoldFromReview", () => {
  const createdAt = "2026-05-23T12:01:00.000Z";

  it("creates a pending hold from PP-000001 approved review record", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildProofReviewRecord({
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });

    const result = createPendingHoldFromReview(record, { store, createdAt });

    expect(result).toEqual({
      outcome: "created",
      sessionId: record.sessionId,
      hold: {
        sessionId: record.sessionId,
        userId: record.userId,
        localUserRef: record.localUserRef,
        contentId: record.contentId,
        offerId: record.offerId,
        packetId: "pkt-test-001",
        artifactId: "PP-000001",
        amount: 100,
        amountBreakdown: approvedAmountBreakdown,
        status: "pending",
        releaseStatus: "not_released",
        createdAt,
        reviewAudit: {
          sessionId: record.sessionId,
          reviewedAt: record.reviewedAt,
          reviewStatus: "approved",
          artifactId: "PP-000001",
          packetId: "pkt-test-001",
          lifecycleEventCount: record.lifecycleEvents.length
        }
      }
    });
  });

  it("creates a pending hold for partial settlement-eligible review", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildPartialProofReviewRecord();

    const result = createPendingHoldFromReview(record, { store, createdAt });

    expect(result.outcome).toBe("created");
    expect(result.hold?.status).toBe("pending");
    expect(result.hold?.releaseStatus).toBe("not_released");
    expect(result.hold?.reviewAudit.reviewStatus).toBe("partial");
    expect(result.hold?.amount).toBe(50);
    expect(result.hold?.amountBreakdown).toEqual({
      policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
      currency: SETTLEMENT_CURRENCY_V1,
      offerId: DEFAULT_FIXTURE_OFFER_ID,
      baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
      statusMultiplier: SETTLEMENT_PARTIAL_MULTIPLIER_V1,
      computedAmountMinor: 50,
      presenceUnits: null
    });
  });

  it.each(["pending", "rejected", "escalated"] as const)(
    "skips non-settlement-eligible review status %s",
    (status) => {
      const store = new InMemoryPendingHoldStore();
      const base = buildProofReviewRecord();
      const record = buildProofReviewRecord({
        status,
        review: {
          ...base.review,
          status
        }
      });

      const result = createPendingHoldFromReview(record, { store });

      expect(result).toEqual({
        outcome: "skipped",
        skipReason: "review_not_settlement_eligible",
        sessionId: record.sessionId
      });
      expect(store.getBySessionId(record.sessionId)).toBeNull();
    }
  );

  it("returns existing hold on idempotent recall by sessionId", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildProofReviewRecord();

    const first = createPendingHoldFromReview(record, { store, createdAt });
    const second = createPendingHoldFromReview(record, { store, createdAt });

    expect(first.outcome).toBe("created");
    expect(second).toEqual({
      outcome: "existing",
      hold: first.hold,
      sessionId: record.sessionId
    });
    expect(store.getBySessionId(record.sessionId)).toEqual(first.hold);
  });

  it("populates hold amount without writing review.settlementAmount", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildProofReviewRecord();

    expect(record.review.settlementAmount).toBeNull();

    const result = createPendingHoldFromReview(record, { store, createdAt });

    expect(result.hold?.amount).toBe(100);
    expect(result.hold?.amountBreakdown).toEqual(approvedAmountBreakdown);
    expect(record.review.settlementAmount).toBeNull();
  });

  it("skips when offer settlement terms are missing", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildProofReviewRecord({ offerId: "unknown-offer" });
    const offerTermsProvider = new InMemoryOfferSettlementTermsProvider({});

    const result = createPendingHoldFromReview(record, {
      store,
      offerTermsProvider
    });

    expect(result).toEqual({
      outcome: "skipped",
      skipReason: "offer_settlement_terms_missing",
      sessionId: record.sessionId
    });
    expect(store.getBySessionId(record.sessionId)).toBeNull();
  });

  it("skips when computed settlement amount is zero", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildPartialProofReviewRecord();
    const offerTermsProvider = new InMemoryOfferSettlementTermsProvider({
      [DEFAULT_FIXTURE_OFFER_ID]: {
        ...DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS,
        baseRewardMinor: 1
      }
    });

    const result = createPendingHoldFromReview(record, {
      store,
      offerTermsProvider
    });

    expect(result).toEqual({
      outcome: "skipped",
      skipReason: "settlement_amount_zero",
      sessionId: record.sessionId
    });
    expect(store.getBySessionId(record.sessionId)).toBeNull();
  });

  it("skips when record.status and record.review.status mismatch", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildProofReviewRecord({
      status: "approved",
      review: {
        ...buildProofReviewRecord().review,
        status: "partial"
      }
    });

    const result = createPendingHoldFromReview(record, { store });

    expect(result).toEqual({
      outcome: "skipped",
      skipReason: "review_status_mismatch",
      sessionId: record.sessionId
    });
    expect(store.getBySessionId(record.sessionId)).toBeNull();
  });
});

describe("PendingHoldService", () => {
  it("creates and retrieves holds through injected store", () => {
    const store = new InMemoryPendingHoldStore();
    const service = new PendingHoldService(store);
    const record = buildProofReviewRecord();

    const result = service.createPendingHoldFromReview(record, {
      createdAt: "2026-05-23T12:01:00.000Z"
    });

    expect(result.outcome).toBe("created");
    expect(service.getHoldBySessionId(record.sessionId)).toEqual(result.hold);
  });
});

describe("ProofReviewService → createPendingHoldFromReview boundary", () => {
  it("creates pending hold after PP-000001 review submission", () => {
    const reviewService = new ProofReviewService(new InMemoryProofReviewStore());
    const holdStore = new InMemoryPendingHoldStore();

    const record = reviewService.submitProofPacketForReview(pp000001Packet, {
      artifactId: "PP-000001",
      packetId: "pkt-test-001",
      submittedAt: "2026-05-23T12:00:00.000Z"
    });

    const result = createPendingHoldFromReview(record, {
      store: holdStore,
      createdAt: "2026-05-23T12:01:00.000Z"
    });

    expect(record.status).toBe("approved");
    expect(result.outcome).toBe("created");
    expect(result.hold).toMatchObject({
      sessionId: pp000001Packet.sessionId,
      status: "pending",
      releaseStatus: "not_released",
      amount: 100,
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });
    expect(result.hold?.amountBreakdown).toMatchObject({
      policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
      computedAmountMinor: 100,
      presenceUnits: null
    });
    expect(record.review.settlementAmount).toBeNull();
  });
});
