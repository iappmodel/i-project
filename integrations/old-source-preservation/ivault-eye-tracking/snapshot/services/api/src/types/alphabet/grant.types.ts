import type { AlphabetEvent } from "./event.types";
import type { CoinCode } from "./coin.types";

export type GrantType =
  | "rare_reward"
  | "cash_grant"
  | "education_grant"
  | "creator_grant"
  | "community_grant"
  | "hardship_grant"
  | "youth_grant"
  | "scholarship"
  | "protection_grant"
  | "platform_blessing"
  | "manual_grant";

export type GrantRecordStatus =
  | "eligibility_created"
  | "eligible"
  | "ineligible"
  | "review_required"
  | "approved"
  | "rejected"
  | "treasury_pending"
  | "funded"
  | "issued"
  | "completed"
  | "canceled";

export type GrantOutcomeStatus =
  | "grant_eligible"
  | "grant_ineligible"
  | "grant_review_required"
  | "grant_approved"
  | "grant_rejected"
  | "grant_treasury_pending"
  | "grant_funded"
  | "grant_issued"
  | "grant_canceled";

export type GrantAgeBand =
  | "under_13"
  | "13_15"
  | "16_17"
  | "18_plus"
  | "unknown";

export type GrantReviewStatus =
  | "none"
  | "required"
  | "pending"
  | "approved"
  | "rejected"
  | "escalated";

export type GrantAuditStatus =
  | "none"
  | "required"
  | "created"
  | "complete"
  | "failed";

export type GrantTreasuryStatus =
  | "none"
  | "pending"
  | "reserved"
  | "funded"
  | "rejected";

export interface GrantFulfillmentInstruction {
  fulfillmentType:
    | "wallet_credit"
    | "cash_payout"
    | "scholarship_payment"
    | "creator_fund"
    | "merchant_credit"
    | "real_world_reward"
    | "manual_fulfillment";
  targetUserId: string;
  walletId?: string | null;
  coinCode?: CoinCode | null;
  amount?: number | null;
  description: string;
  requiresGuardianApproval: boolean;
  requiresManualFulfillment: boolean;
  metadata?: Record<string, unknown>;
}

export interface GrantEligibilityRecord {
  grantEligibilityId: string;
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  grantType: GrantType;
  status: GrantRecordStatus;
  uValueScore: number;
  trustScore: number;
  contributionScore: number;
  learningScore: number;
  creationScore: number;
  helpScore: number;
  safetyScore: number;
  originalityScore: number;
  economicNeedScore: number;
  communityImpactScore: number;
  consistencyScore: number;
  rarityScore: number;
  grantAmount: number;
  rewardCoinCode?: CoinCode | null;
  realWorldRewardDescription?: string | null;
  ageBand: GrantAgeBand;
  regionCode?: string | null;
  reviewStatus: GrantReviewStatus;
  auditStatus: GrantAuditStatus;
  treasuryStatus: GrantTreasuryStatus;
  secrecyMode: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  issuedAt?: string | null;
  completedAt?: string | null;
}

export interface GrantSignalInput {
  grantEligibilityId: string;
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  grantType: GrantType;
  currentStatus: GrantRecordStatus;
  uValueScore: number;
  trustScore: number;
  contributionScore: number;
  learningScore: number;
  creationScore: number;
  helpScore: number;
  safetyScore: number;
  originalityScore: number;
  economicNeedScore: number;
  communityImpactScore: number;
  consistencyScore: number;
  rarityScore: number;
  fraudRisk: number;
  safetyRisk: number;
  paymentRisk: number;
  reputationRisk: number;
  complianceRisk: number;
  ageBand: GrantAgeBand;
  regionCode?: string | null;
  regionEligible: boolean;
  treasuryBudgetAvailable: number;
  requestedGrantAmount: number;
  treasuryStatus: GrantTreasuryStatus;
  treasuryReserveRequested: boolean;
  treasuryReserveApproved: boolean;
  reviewStatus: GrantReviewStatus;
  auditStatus: GrantAuditStatus;
  rewardCoinCode?: CoinCode | null;
  realWorldRewardDescription?: string | null;
  guardianApprovalRequired: boolean;
  guardianApprovalReceived: boolean;
  secrecyMode: boolean;
  manualGrantRequested: boolean;
  adminApproved: boolean;
  issueRequested: boolean;
  completeRequested: boolean;
  cancelRequested: boolean;
  metadata?: Record<string, unknown>;
}

export interface GrantRuleSet {
  grantType: GrantType;
  minGrantEligibilityScore: number;
  minHumanValueScore: number;
  minTreasuryReadinessScore: number;
  minBlessingRarityScore: number;
  minUValueScore: number;
  minTrustScore: number;
  minContributionScore: number;
  minConsistencyScore: number;
  maxFraudRisk: number;
  maxSafetyRisk: number;
  maxPaymentRisk: number;
  maxReputationRisk: number;
  maxComplianceRisk: number;
  minGrantAmount: number;
  maxGrantAmount: number;
  allowMinors: boolean;
  requiresGuardianApprovalForMinors: boolean;
  requiresReview: boolean;
  requiresAudit: boolean;
  requiresTreasuryReserve: boolean;
  requiresAdminApproval: boolean;
  allowsSecrecyMode: boolean;
  active: boolean;
}

export interface GrantEvaluationResult {
  grantEligibilityId: string;
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  grantType: GrantType;
  status: GrantOutcomeStatus;
  grantAmount: number;
  rewardCoinCode?: CoinCode | null;
  realWorldRewardDescription?: string | null;
  grantEligibilityScore: number;
  humanValueScore: number;
  grantRiskScore: number;
  treasuryReadinessScore: number;
  blessingRarityScore: number;
  eligible: boolean;
  approved: boolean;
  treasuryReserveRequired: boolean;
  treasuryReserveAuthorized: boolean;
  reviewRequired: boolean;
  auditRequired: boolean;
  issueAuthorized: boolean;
  walletCreditAuthorized: boolean;
  realWorldFulfillmentRequired: boolean;
  guardianApprovalRequired: boolean;
  secrecyMode: boolean;
  fulfillmentInstructions: GrantFulfillmentInstruction[];
  reasons: string[];
  grantEligibilityCreatedEvent: AlphabetEvent;
  grantEligibleEvent?: AlphabetEvent | null;
  grantIneligibleEvent?: AlphabetEvent | null;
  grantReviewRequiredEvent?: AlphabetEvent | null;
  grantApprovedEvent?: AlphabetEvent | null;
  grantRejectedEvent?: AlphabetEvent | null;
  grantTreasuryReservedEvent?: AlphabetEvent | null;
  grantFundedEvent?: AlphabetEvent | null;
  grantIssuedEvent?: AlphabetEvent | null;
  grantCompletedEvent?: AlphabetEvent | null;
  grantRiskDetectedEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
