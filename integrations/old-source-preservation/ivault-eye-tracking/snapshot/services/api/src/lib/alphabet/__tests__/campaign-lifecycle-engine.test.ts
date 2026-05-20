import { describe, expect, it } from "vitest";
import { evaluateCampaignLifecycle } from "../campaign-lifecycle-engine";
import type { CampaignLifecycleSignalInput } from "../../../types/alphabet/campaign-lifecycle.types";

function makeInput(
  overrides: Partial<CampaignLifecycleSignalInput> = {}
): CampaignLifecycleSignalInput {
  return {
    campaignLifecycleId: crypto.randomUUID(),
    campaignId: crypto.randomUUID(),

    businessId: crypto.randomUUID(),
    ownerUserId: crypto.randomUUID(),

    objective: "attention",
    currentStatus: "active",

    rewardCoinCode: "A",
    rewardType: "pending",
    actionType: "verify_attention",

    requestedBudget: 1000,
    approvedBudget: 1000,
    reservedBudget: 1000,
    spentBudget: 100,
    remainingBudget: 900,
    refundedBudget: 0,

    rewardAmountPerAction: 1,
    requestedRewardAmount: 1,

    maxRewardPerUser: 10,
    userRewardedAmountSoFar: 2,

    dailyRewardCap: 200,
    dailySpentAmount: 50,

    totalParticipantCap: 1000,
    participantCount: 100,

    actionVerificationRequired: true,
    actionVerified: true,

    policyAllowed: true,
    policyRequiresReview: false,
    policyBlocked: false,

    treasuryBudgetApproved: true,
    treasuryReserveAllocated: true,
    treasuryBudgetRejected: false,

    campaignStartReached: true,
    campaignEndReached: false,

    verificationPassRate: 0.85,
    fraudRate: 0.01,
    suspiciousRate: 0.02,
    completionRate: 0.7,

    trustScore: 80,
    businessTrustScore: 85,
    riskScore: 0.05,

    pauseRequested: false,
    resumeRequested: false,
    refundRequested: false,
    suspendRequested: false,
    completeRequested: false,

    metadata: {},
    ...overrides
  };
}

describe("campaign-lifecycle-engine", () => {
  it("authorizes reward for healthy active campaign", () => {
    const result = evaluateCampaignLifecycle(makeInput());

    expect(result.status).toBe("campaign_active");
    expect(result.rewardAuthorized).toBe(true);
    expect(result.authorizedRewardAmount).toBe(1);
    expect(result.campaignRewardAuthorizedEvent?.eventType).toBe(
      "campaign_reward_authorized"
    );
  });

  it("does not authorize reward without reserved budget", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        treasuryBudgetApproved: false,
        treasuryReserveAllocated: false,
        reservedBudget: 0,
        remainingBudget: 0
      })
    );

    expect(result.status).toBe("campaign_treasury_pending");
    expect(result.rewardAuthorized).toBe(false);
  });

  it("rejects policy blocked campaign", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        policyAllowed: false,
        policyBlocked: true
      })
    );

    expect(result.status).toBe("campaign_rejected");
    expect(result.campaignRejectedEvent?.eventType).toBe("campaign_rejected");
  });

  it("pauses campaign on suspicious rate", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        suspiciousRate: 0.9
      })
    );

    expect(result.status).toBe("campaign_paused");
    expect(result.shouldPause).toBe(true);
    expect(result.campaignRiskDetectedEvent?.eventType).toBe("campaign_risk_detected");
  });

  it("suspends campaign on fraud rate", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        fraudRate: 0.9
      })
    );

    expect(result.status).toBe("campaign_suspended");
    expect(result.shouldSuspend).toBe(true);
  });

  it("marks exhausted when remaining budget is zero", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        remainingBudget: 0
      })
    );

    expect(result.status).toBe("campaign_exhausted");
    expect(result.rewardAuthorized).toBe(false);
  });

  it("blocks reward when user cap exceeded", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        userRewardedAmountSoFar: 10,
        maxRewardPerUser: 10
      })
    );

    expect(result.status).toBe("campaign_active");
    expect(result.rewardAuthorized).toBe(false);
  });

  it("blocks reward when daily cap exceeded", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        dailySpentAmount: 200,
        dailyRewardCap: 200
      })
    );

    expect(result.rewardAuthorized).toBe(false);
  });

  it("blocks reward when action verification is missing", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        actionVerified: false
      })
    );

    expect(result.rewardAuthorized).toBe(false);
  });

  it("refunds unspent budget when requested", () => {
    const result = evaluateCampaignLifecycle(
      makeInput({
        refundRequested: true
      })
    );

    expect(result.shouldRefund).toBe(true);
    expect(result.refundableBudget).toBe(900);
    expect(result.campaignRefundedEvent?.eventType).toBe("campaign_refunded");
  });
});
