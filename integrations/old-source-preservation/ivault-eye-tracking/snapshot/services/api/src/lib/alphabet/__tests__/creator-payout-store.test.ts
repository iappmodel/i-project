import { beforeEach, describe, expect, it } from "vitest";
import {
  createCreatorPayoutRecord,
  evaluateStoredCreatorPayout,
  getCreatorPayoutRecord,
  getCreatorPayoutResult,
  listCreatorPayoutRecordsForCreator,
  resetCreatorPayoutStoreForTests,
  updateCreatorPayoutDisputeStatus
} from "../creator-payout-store";

describe("creator-payout-store", () => {
  beforeEach(() => {
    resetCreatorPayoutStoreForTests();
  });

  function createBaseRecord() {
    const userId = crypto.randomUUID();
    const walletId = crypto.randomUUID();

    return createCreatorPayoutRecord({
      creatorId: crypto.randomUUID(),
      userId,
      walletId,
      revenueSource: "content_sale",
      grossRevenue: 100,
      collaborators: [
        {
          recipientUserId: userId,
          recipientWalletId: walletId,
          role: "creator",
          splitRate: 1
        }
      ]
    });
  }

  it("creates creator payout record", () => {
    const record = createBaseRecord();

    expect(record.grossRevenue).toBe(100);
    expect(record.platformFeeAmount).toBe(20);
    expect(record.creatorNetRevenue).toBe(80);
    expect(record.distributableAmount).toBe(80);

    const stored = getCreatorPayoutRecord(record.creatorPayoutId);
    expect(stored?.creatorPayoutId).toBe(record.creatorPayoutId);
  });

  it("lists creator payout records", () => {
    const record = createBaseRecord();

    expect(listCreatorPayoutRecordsForCreator(record.creatorId)).toHaveLength(1);
  });

  it("evaluates stored payout", () => {
    const record = createBaseRecord();

    const result = evaluateStoredCreatorPayout({
      creatorPayoutId: record.creatorPayoutId,
      holdExpired: true,
      originalityScore: 0.9,
      attributionConfidenceScore: 0.9,
      contentQualityScore: 0.85,
      audienceQualityScore: 0.8,
      copyrightRisk: 0.02,
      safetyRisk: 0.02,
      fraudRisk: 0.02,
      chargebackRisk: 0.02,
      refundRisk: 0.02,
      payoutVelocityRisk: 0.02,
      trustScore: 80,
      uValueScore: 40,
      payoutPoolAvailableAmount: 1000,
      payoutPoolCoverageRatio: 0.9,
      recentPenaltyCount: 0,
      recentSeverePenaltyCount: 0,
      creatorAccountLocked: false,
      payoutLocked: false,
      reversalRequested: false,
      completionRequested: false
    });

    expect(result.status).toBe("payout_approved");

    const updated = getCreatorPayoutRecord(record.creatorPayoutId);
    expect(updated?.status).toBe("approved");

    const storedResult = getCreatorPayoutResult(record.creatorPayoutId);
    expect(storedResult?.status).toBe("payout_approved");
  });

  it("marks completed when completion requested", () => {
    const record = createBaseRecord();

    const result = evaluateStoredCreatorPayout({
      creatorPayoutId: record.creatorPayoutId,
      holdExpired: true,
      originalityScore: 0.9,
      attributionConfidenceScore: 0.9,
      contentQualityScore: 0.85,
      audienceQualityScore: 0.8,
      copyrightRisk: 0.02,
      safetyRisk: 0.02,
      fraudRisk: 0.02,
      chargebackRisk: 0.02,
      refundRisk: 0.02,
      payoutVelocityRisk: 0.02,
      trustScore: 80,
      uValueScore: 40,
      payoutPoolAvailableAmount: 1000,
      payoutPoolCoverageRatio: 0.9,
      recentPenaltyCount: 0,
      recentSeverePenaltyCount: 0,
      creatorAccountLocked: false,
      payoutLocked: false,
      reversalRequested: false,
      completionRequested: true
    });

    expect(result.status).toBe("payout_approved");
    expect(result.creatorPayoutCompletedEvent?.eventType).toBe("creator_payout_completed");

    const updated = getCreatorPayoutRecord(record.creatorPayoutId);
    expect(updated?.status).toBe("completed");
  });

  it("updates dispute status", () => {
    const record = createBaseRecord();

    const disputed = updateCreatorPayoutDisputeStatus({
      creatorPayoutId: record.creatorPayoutId,
      disputeStatus: "opened"
    });

    expect(disputed.status).toBe("disputed");
    expect(disputed.disputeStatus).toBe("opened");
  });

  it("stores disputed evaluation", () => {
    const record = createBaseRecord();

    updateCreatorPayoutDisputeStatus({
      creatorPayoutId: record.creatorPayoutId,
      disputeStatus: "opened"
    });

    const result = evaluateStoredCreatorPayout({
      creatorPayoutId: record.creatorPayoutId,
      holdExpired: true,
      originalityScore: 0.9,
      attributionConfidenceScore: 0.9,
      contentQualityScore: 0.85,
      audienceQualityScore: 0.8,
      copyrightRisk: 0.02,
      safetyRisk: 0.02,
      fraudRisk: 0.02,
      chargebackRisk: 0.02,
      refundRisk: 0.02,
      payoutVelocityRisk: 0.02,
      trustScore: 80,
      uValueScore: 40,
      payoutPoolAvailableAmount: 1000,
      payoutPoolCoverageRatio: 0.9,
      recentPenaltyCount: 0,
      recentSeverePenaltyCount: 0,
      creatorAccountLocked: false,
      payoutLocked: false,
      reversalRequested: false,
      completionRequested: false
    });

    expect(result.status).toBe("payout_disputed");
  });
});
