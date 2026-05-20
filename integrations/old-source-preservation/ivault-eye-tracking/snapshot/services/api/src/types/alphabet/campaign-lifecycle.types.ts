import type { AlphabetEvent } from "./event.types";
import type { CoinCode } from "./coin.types";

export type CampaignObjective =
  | "attention"
  | "engagement"
  | "conversion"
  | "local_presence"
  | "learning"
  | "creator_boost"
  | "product_feedback"
  | "work_task"
  | "community_action";

export type CampaignLifecycleStatus =
  | "draft"
  | "policy_pending"
  | "treasury_pending"
  | "approved"
  | "active"
  | "paused"
  | "exhausted"
  | "completed"
  | "rejected"
  | "refunded"
  | "suspended";

export type CampaignDecisionStatus =
  | "campaign_draft"
  | "campaign_policy_pending"
  | "campaign_treasury_pending"
  | "campaign_approved"
  | "campaign_active"
  | "campaign_paused"
  | "campaign_exhausted"
  | "campaign_completed"
  | "campaign_rejected"
  | "campaign_suspended";

export type CampaignRewardType =
  | "spendable"
  | "pending"
  | "score"
  | "identity"
  | "access";

export type CampaignActionType =
  | "watch"
  | "click"
  | "verify_attention"
  | "visit_location"
  | "complete_learning"
  | "submit_feedback"
  | "create_content"
  | "complete_task"
  | "share"
  | "purchase"
  | "custom";

export interface CampaignLifecycle {
  campaignLifecycleId: string;
  campaignId: string;

  businessId: string;
  ownerUserId: string;

  objective: CampaignObjective;
  status: CampaignLifecycleStatus;

  rewardCoinCode: CoinCode;
  rewardType: CampaignRewardType;
  actionType: CampaignActionType;

  requestedBudget: number;
  approvedBudget: number;
  reservedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  refundedBudget: number;

  rewardAmountPerAction: number;
  maxRewardPerUser: number;
  dailyRewardCap: number;
  totalParticipantCap: number;

  participantCount: number;
  authorizedRewardCount: number;

  startsAt: string;
  endsAt: string;

  createdAt: string;
  updatedAt: string;
  activatedAt?: string | null;
  completedAt?: string | null;
}

export interface CampaignLifecycleSignalInput {
  campaignLifecycleId: string;
  campaignId: string;

  businessId: string;
  ownerUserId: string;

  objective: CampaignObjective;
  currentStatus: CampaignLifecycleStatus;

  rewardCoinCode: CoinCode;
  rewardType: CampaignRewardType;
  actionType: CampaignActionType;

  requestedBudget: number;
  approvedBudget: number;
  reservedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  refundedBudget: number;

  rewardAmountPerAction: number;
  requestedRewardAmount: number;

  maxRewardPerUser: number;
  userRewardedAmountSoFar: number;

  dailyRewardCap: number;
  dailySpentAmount: number;

  totalParticipantCap: number;
  participantCount: number;

  actionVerificationRequired: boolean;
  actionVerified: boolean;

  policyAllowed: boolean;
  policyRequiresReview: boolean;
  policyBlocked: boolean;

  treasuryBudgetApproved: boolean;
  treasuryReserveAllocated: boolean;
  treasuryBudgetRejected: boolean;

  campaignStartReached: boolean;
  campaignEndReached: boolean;

  verificationPassRate: number;
  fraudRate: number;
  suspiciousRate: number;
  completionRate: number;

  trustScore: number;
  businessTrustScore: number;
  riskScore: number;

  pauseRequested: boolean;
  resumeRequested: boolean;
  refundRequested: boolean;
  suspendRequested: boolean;
  completeRequested: boolean;

  metadata?: Record<string, unknown>;
}

export interface CampaignLifecycleRuleSet {
  objective: CampaignObjective;

  minRequestedBudget: number;
  maxRequestedBudget: number;

  minCampaignReadinessScore: number;
  minBudgetHealthScore: number;
  minRewardIssuanceEligibilityScore: number;

  maxCampaignRiskScore: number;
  maxFraudRate: number;
  maxSuspiciousRate: number;
  minVerificationPassRate: number;
  minCompletionRate: number;

  requiresPolicyAllow: boolean;
  requiresTreasuryReserve: boolean;
  requiresActionVerification: boolean;

  allowSpendableRewards: boolean;
  allowPendingRewards: boolean;
  allowScoreRewards: boolean;
  allowIdentityRewards: boolean;
  allowAccessRewards: boolean;

  active: boolean;
}

export interface CampaignLifecycleResult {
  campaignLifecycleId: string;
  campaignId: string;

  businessId: string;
  ownerUserId: string;

  status: CampaignDecisionStatus;

  rewardCoinCode: CoinCode;
  rewardType: CampaignRewardType;

  requestedRewardAmount: number;
  authorizedRewardAmount: number;

  reservedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  refundableBudget: number;

  campaignReadinessScore: number;
  budgetHealthScore: number;
  campaignRiskScore: number;
  rewardIssuanceEligibilityScore: number;

  rewardAuthorized: boolean;
  budgetShouldDecrement: boolean;
  shouldPause: boolean;
  shouldSuspend: boolean;
  shouldRefund: boolean;
  shouldComplete: boolean;

  reviewRecommended: boolean;
  auditRecommended: boolean;

  reasons: string[];

  campaignCreatedEvent: AlphabetEvent;
  campaignPolicyCheckedEvent?: AlphabetEvent | null;
  campaignBudgetReservedEvent?: AlphabetEvent | null;
  campaignApprovedEvent?: AlphabetEvent | null;
  campaignActivatedEvent?: AlphabetEvent | null;
  campaignPausedEvent?: AlphabetEvent | null;
  campaignExhaustedEvent?: AlphabetEvent | null;
  campaignCompletedEvent?: AlphabetEvent | null;
  campaignRejectedEvent?: AlphabetEvent | null;
  campaignRefundedEvent?: AlphabetEvent | null;
  campaignRewardAuthorizedEvent?: AlphabetEvent | null;
  campaignRiskDetectedEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
