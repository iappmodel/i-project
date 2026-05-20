import type { PopsRewardDecisionStatus } from "../rewards/pops-reward-decision.types";

export const POPS_WALLET_REWARD_STATUS = {
  NO_REWARD: "NO_REWARD",
  PENDING: "PENDING",
  PENDING_REVIEW: "PENDING_REVIEW",
  HELD: "HELD",
  RELEASED: "RELEASED",
  PARTIALLY_RELEASED: "PARTIALLY_RELEASED",
  DENIED: "DENIED",
  EXPIRED: "EXPIRED"
} as const;

export type PopsWalletRewardStatus =
  (typeof POPS_WALLET_REWARD_STATUS)[keyof typeof POPS_WALLET_REWARD_STATUS];

export const POPS_WALLET_HOLD_REASON = {
  CAMPAIGN_REQUIRES_HOLD: "CAMPAIGN_REQUIRES_HOLD",
  HIGH_VALUE_REWARD: "HIGH_VALUE_REWARD",
  FRAUD_RISK_MEDIUM: "FRAUD_RISK_MEDIUM",
  FRAUD_RISK_HIGH: "FRAUD_RISK_HIGH",
  KYC_REQUIRED: "KYC_REQUIRED",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED"
} as const;

export type PopsWalletHoldReason =
  (typeof POPS_WALLET_HOLD_REASON)[keyof typeof POPS_WALLET_HOLD_REASON];

export interface PopsWalletRewardIntent {
  id: string;
  userId: string;
  sessionId: string;
  campaignId: string;
  rewardDecisionId: string;
  coinType: string;
  amount: number;
  status: PopsWalletRewardStatus;
  holdReason: PopsWalletHoldReason | null;
  releaseEligibleAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PopsWalletDeniedAuditRecord {
  id: string;
  userId: string;
  sessionId: string;
  campaignId: string;
  rewardDecisionId: string;
  decision: PopsRewardDecisionStatus;
  reason: string;
  createdAt: string;
}

export interface PopsWalletReleaseEvent {
  id: string;
  rewardIntentId: string;
  fromStatus: PopsWalletRewardStatus;
  toStatus: PopsWalletRewardStatus;
  amountReleased: number;
  createdAt: string;
}

export interface PopsWalletHoldEvent {
  id: string;
  rewardIntentId: string;
  reason: PopsWalletHoldReason;
  createdAt: string;
}

export interface PopsWalletReleaseContext {
  trustTier: number;
  fraudRisk: number;
  amount: number;
  campaignRequiresHold: boolean;
  kycRequired: boolean;
  kycCompleted: boolean;
  ageRestricted: boolean;
  ageEligible: boolean;
}
