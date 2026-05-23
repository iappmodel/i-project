import { describe, expect, it } from "vitest";
import { ProofReviewService } from "../../review/proof-review-service.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import {
  createPendingHoldFromReview,
  PendingHoldService
} from "../../settlement/pending-hold-service.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";
import { buildProofReviewRecord } from "../review/proof-review-store.contract.js";
import { buildPartialProofReviewRecord } from "./pending-hold-store.contract.js";

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
        amount: null,
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

  it("does not populate settlement amount on hold or review", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildProofReviewRecord();

    expect(record.review.settlementAmount).toBeNull();

    const result = createPendingHoldFromReview(record, { store, createdAt });

    expect(result.hold?.amount).toBeNull();
    expect(record.review.settlementAmount).toBeNull();
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
      amount: null,
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });
  });
});
