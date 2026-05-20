import {
  approveCampaignBudget,
  createCampaignLifecycle,
  evaluateStoredCampaignLifecycle
} from "./campaign-lifecycle-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import {
  applyRewardIssuanceResult,
  createWallet
} from "./wallet-store";
import {
  createTrustEventFromCampaignLifecycle,
  createUValueEventFromCampaignLifecycle
} from "./campaign-lifecycle-event-factory";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";

const businessId = crypto.randomUUID();
const ownerUserId = crypto.randomUUID();
const participantUserId = crypto.randomUUID();
const participantWallet = createWallet(participantUserId);

const campaign = createCampaignLifecycle({
  businessId,
  ownerUserId,
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

/**
 * Production:
 * This comes after Policy Engine + Treasury Engine approval.
 */
approveCampaignBudget({
  campaignLifecycleId: campaign.campaignLifecycleId,
  approvedBudget: 1000,
  reservedBudget: 1000
});

const campaignResult = evaluateStoredCampaignLifecycle({
  campaignLifecycleId: campaign.campaignLifecycleId,

  requestedRewardAmount: 1,

  maxRewardPerUser: 10,
  userRewardedAmountSoFar: 0,

  dailyRewardCap: 200,
  dailySpentAmount: 0,

  totalParticipantCap: 1000,
  participantCount: 0,

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

const trustEvent = createTrustEventFromCampaignLifecycle(campaignResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromCampaignLifecycle(campaignResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

if (campaignResult.rewardAuthorized && campaignResult.campaignRewardAuthorizedEvent) {
  const rewardResult = issueRewardFromVerifiedEvent({
    walletId: participantWallet.walletId,
    context: {
      event: campaignResult.campaignRewardAuthorizedEvent,
      trustScore: 80,
      trustTier: 3,
      qualityScore:
        campaignResult.campaignRewardAuthorizedEvent.qualityScore ??
        campaignResult.rewardIssuanceEligibilityScore,
      riskScore: campaignResult.campaignRiskScore,
      ageBand: "18_plus",
      hasBudgetSource: true
    }
  });

  applyRewardIssuanceResult(rewardResult);
}

console.log("Campaign lifecycle:");
console.log(JSON.stringify(campaignResult, null, 2));

console.log("Business Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(ownerUserId), null, 2));

console.log("Business U Value:");
console.log(JSON.stringify(getOrCreateUValueState(ownerUserId), null, 2));
