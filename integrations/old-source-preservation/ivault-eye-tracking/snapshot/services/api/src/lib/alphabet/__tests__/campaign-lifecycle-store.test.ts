import { beforeEach, describe, expect, it } from "vitest";
import {
  approveCampaignBudget,
  createCampaignLifecycle,
  evaluateStoredCampaignLifecycle,
  getCampaignLifecycle,
  getCampaignLifecycleResult,
  listCampaignLifecyclesByBusiness,
  resetCampaignLifecycleStoreForTests,
} from "../campaign-lifecycle-store";

describe("campaign-lifecycle-store", () => {
  beforeEach(() => {
    resetCampaignLifecycleStoreForTests();
  });

  function createBaseCampaign() {
    return createCampaignLifecycle({
      businessId: crypto.randomUUID(),
      ownerUserId: crypto.randomUUID(),
      objective: "attention",
      rewardCoinCode: "A",
      rewardType: "pending",
      actionType: "verify_attention",
      requestedBudget: 1000,
      rewardAmountPerAction: 1,
      maxRewardPerUser: 10,
      dailyRewardCap: 200,
      totalParticipantCap: 1000,
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      endsAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString()
    });
  }

  it("creates campaign lifecycle", () => {
    const campaign = createBaseCampaign();

    expect(campaign.status).toBe("draft");

    const stored = getCampaignLifecycle(campaign.campaignLifecycleId);
    expect(stored?.campaignLifecycleId).toBe(campaign.campaignLifecycleId);
  });

  it("approves campaign budget", () => {
    const campaign = createBaseCampaign();

    const updated = approveCampaignBudget({
      campaignLifecycleId: campaign.campaignLifecycleId,
      approvedBudget: 1000,
      reservedBudget: 1000
    });

    expect(updated.approvedBudget).toBe(1000);
    expect(updated.remainingBudget).toBe(1000);
  });

  it("evaluates and authorizes reward", () => {
    const campaign = createBaseCampaign();

    approveCampaignBudget({
      campaignLifecycleId: campaign.campaignLifecycleId,
      approvedBudget: 1000,
      reservedBudget: 1000
    });

    const result = evaluateStoredCampaignLifecycle({
      campaignLifecycleId: campaign.campaignLifecycleId,

      requestedRewardAmount: 1,

      maxRewardPerUser: 10,
      userRewardedAmountSoFar: 0,

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
      completeRequested: false
    });

    expect(result.rewardAuthorized).toBe(true);

    const updated = getCampaignLifecycle(campaign.campaignLifecycleId);
    expect(updated?.spentBudget).toBe(1);
    expect(updated?.remainingBudget).toBe(999);
    expect(updated?.authorizedRewardCount).toBe(1);
  });

  it("stores result", () => {
    const campaign = createBaseCampaign();

    approveCampaignBudget({
      campaignLifecycleId: campaign.campaignLifecycleId,
      approvedBudget: 1000,
      reservedBudget: 1000
    });

    evaluateStoredCampaignLifecycle({
      campaignLifecycleId: campaign.campaignLifecycleId,

      requestedRewardAmount: 1,

      maxRewardPerUser: 10,
      userRewardedAmountSoFar: 0,

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
      completeRequested: false
    });

    const storedResult = getCampaignLifecycleResult(campaign.campaignLifecycleId);
    expect(storedResult?.campaignLifecycleId).toBe(campaign.campaignLifecycleId);
  });

  it("lists campaigns by business", () => {
    const campaign = createBaseCampaign();

    expect(listCampaignLifecyclesByBusiness(campaign.businessId)).toHaveLength(1);
  });

  it("refunds remaining campaign budget", () => {
    const campaign = createBaseCampaign();

    approveCampaignBudget({
      campaignLifecycleId: campaign.campaignLifecycleId,
      approvedBudget: 1000,
      reservedBudget: 1000
    });

    const result = evaluateStoredCampaignLifecycle({
      campaignLifecycleId: campaign.campaignLifecycleId,

      requestedRewardAmount: 0,

      maxRewardPerUser: 10,
      userRewardedAmountSoFar: 0,

      dailyRewardCap: 200,
      dailySpentAmount: 0,

      totalParticipantCap: 1000,
      participantCount: 0,

      actionVerificationRequired: false,
      actionVerified: false,

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
      refundRequested: true,
      suspendRequested: false,
      completeRequested: false
    });

    expect(result.shouldRefund).toBe(true);

    const updated = getCampaignLifecycle(campaign.campaignLifecycleId);
    expect(updated?.status).toBe("refunded");
    expect(updated?.remainingBudget).toBe(0);
    expect(updated?.refundedBudget).toBe(1000);
  });
});
