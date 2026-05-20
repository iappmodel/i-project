import { describe, expect, it } from "vitest";
import type { CreatorPayoutSignalInput } from "../../../types/alphabet/creator-payout.types";
import {
  calculateCreatorPayoutAmounts,
  calculateCreatorSplits,
  evaluateCreatorPayout
} from "../creator-payout-engine";

function makeInput(
  overrides: Partial<CreatorPayoutSignalInput> = {}
): CreatorPayoutSignalInput {
  const userId = crypto.randomUUID();
  const walletId = crypto.randomUUID();

  return {
    creatorPayoutId: crypto.randomUUID(),
    creatorId: crypto.randomUUID(),
    userId,
    walletId,
    revenueSource: "content_sale",
    sourceObjectId: crypto.randomUUID(),
    grossRevenue: 100,
    platformFeeRate: 0.2,
    platformFeeAmount: 20,
    taxWithholdingEstimate: 0,
    creatorNetRevenue: 80,
    distributableAmount: 80,
    collaborators: [
      {
        recipientUserId: userId,
        recipientWalletId: walletId,
        role: "creator",
        splitRate: 1,
        splitAmount: 80
      }
    ],
    payoutHoldHours: 48,
    holdExpired: true,
    disputeStatus: "none",
    contentSafetyStatus: "clear",
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
    completionRequested: false,
    metadata: {},
    ...overrides
  };
}

describe("creator-payout-engine", () => {
  it("approves clean creator payout", () => {
    const result = evaluateCreatorPayout(makeInput());

    expect(result.status).toBe("payout_approved");
    expect(result.walletCreditAuthorized).toBe(true);
    expect(result.creatorPayoutApprovedEvent?.eventType).toBe("creator_payout_approved");
  });

  it("holds payout during hold period", () => {
    const result = evaluateCreatorPayout(
      makeInput({
        holdExpired: false
      })
    );

    expect(result.status).toBe("payout_pending_hold");
    expect(result.holdRequired).toBe(true);
    expect(result.creatorPayoutHeldEvent?.eventType).toBe("creator_payout_held");
  });

  it("disputes payout when dispute is opened", () => {
    const result = evaluateCreatorPayout(
      makeInput({
        disputeStatus: "opened"
      })
    );

    expect(result.status).toBe("payout_disputed");
    expect(result.disputeRequired).toBe(true);
    expect(result.creatorPayoutDisputedEvent?.eventType).toBe("creator_payout_disputed");
  });

  it("reverses payout on reversal request", () => {
    const result = evaluateCreatorPayout(
      makeInput({
        reversalRequested: true
      })
    );

    expect(result.status).toBe("payout_reversed");
    expect(result.reversalRequired).toBe(true);
    expect(result.creatorPayoutReversedEvent?.eventType).toBe("creator_payout_reversed");
  });

  it("rejects blocked content safety", () => {
    const result = evaluateCreatorPayout(
      makeInput({
        contentSafetyStatus: "blocked"
      })
    );

    expect(result.status).toBe("payout_rejected");
    expect(result.reasons).toContain("content_safety_blocked");
  });

  it("flags high fraud as suspicious", () => {
    const result = evaluateCreatorPayout(
      makeInput({
        fraudRisk: 0.95
      })
    );

    expect(result.status).toBe("payout_suspicious");
    expect(result.creatorPayoutFraudDetectedEvent?.eventType).toBe(
      "creator_payout_fraud_detected"
    );
  });

  it("detects payout pool unavailable", () => {
    const result = evaluateCreatorPayout(
      makeInput({
        payoutPoolAvailableAmount: 10
      })
    );

    expect(result.status).toBe("payout_pool_unavailable");
    expect(result.walletCreditAuthorized).toBe(false);
  });

  it("holds weak attribution", () => {
    const result = evaluateCreatorPayout(
      makeInput({
        attributionConfidenceScore: 0.1
      })
    );

    expect(result.status).toBe("payout_pending_hold");
    expect(result.reasons).toContain("attribution_confidence_below_minimum");
  });

  it("calculates payout amounts", () => {
    const amounts = calculateCreatorPayoutAmounts({
      grossRevenue: 100,
      platformFeeRate: 0.2,
      taxWithholdingRate: 0.1
    });

    expect(amounts.platformFeeAmount).toBe(20);
    expect(amounts.creatorNetRevenue).toBe(80);
    expect(amounts.taxWithholdingEstimate).toBe(8);
    expect(amounts.distributableAmount).toBe(72);
  });

  it("calculates creator splits", () => {
    const splits = calculateCreatorSplits({
      distributableAmount: 100,
      recipients: [
        {
          recipientUserId: "creator",
          role: "creator",
          splitRate: 0.7
        },
        {
          recipientUserId: "collab",
          role: "collaborator",
          splitRate: 0.3
        }
      ]
    });

    expect(splits[0]?.splitAmount).toBe(70);
    expect(splits[1]?.splitAmount).toBe(30);
  });
});
