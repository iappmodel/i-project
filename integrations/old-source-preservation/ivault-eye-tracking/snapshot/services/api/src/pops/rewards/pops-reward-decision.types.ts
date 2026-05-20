export const POPS_REWARD_DECISION_STATUS = {
  APPROVED_FULL: "APPROVED_FULL",
  APPROVED_PARTIAL: "APPROVED_PARTIAL",
  PENDING_REVIEW: "PENDING_REVIEW",
  HELD: "HELD",
  DENIED_LOW_CONFIDENCE: "DENIED_LOW_CONFIDENCE",
  DENIED_FRAUD_RISK: "DENIED_FRAUD_RISK",
  DENIED_INELIGIBLE: "DENIED_INELIGIBLE",
  DENIED_DUPLICATE: "DENIED_DUPLICATE",
  DENIED_EXPIRED: "DENIED_EXPIRED"
} as const;

export type PopsRewardDecisionStatus =
  (typeof POPS_REWARD_DECISION_STATUS)[keyof typeof POPS_REWARD_DECISION_STATUS];

export const POPS_REWARD_HOLD_REASON = {
  HIGH_VALUE_REWARD: "HIGH_VALUE_REWARD",
  LOW_TRUST_TIER: "LOW_TRUST_TIER",
  FRAUD_RISK_MEDIUM: "FRAUD_RISK_MEDIUM",
  FRAUD_RISK_HIGH: "FRAUD_RISK_HIGH",
  SENSOR_DEGRADED: "SENSOR_DEGRADED",
  CAMPAIGN_RULE_UNMET: "CAMPAIGN_RULE_UNMET",
  KYC_REQUIRED: "KYC_REQUIRED",
  AGE_RESTRICTED: "AGE_RESTRICTED",
  DEVICE_INTEGRITY_LOW: "DEVICE_INTEGRITY_LOW",
  DUPLICATE_ATTEMPT: "DUPLICATE_ATTEMPT",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED"
} as const;

export type PopsRewardHoldReason =
  (typeof POPS_REWARD_HOLD_REASON)[keyof typeof POPS_REWARD_HOLD_REASON];

export const POPS_WALLET_DECISION_STATUS = {
  PENDING_AVAILABLE_SOON: "PENDING_AVAILABLE_SOON",
  PENDING_REVIEW: "PENDING_REVIEW",
  HELD: "HELD",
  NONE: "NONE"
} as const;

export type PopsWalletDecisionStatus =
  (typeof POPS_WALLET_DECISION_STATUS)[keyof typeof POPS_WALLET_DECISION_STATUS];

export const POPS_COMPLETION_LEVEL = {
  COMPLETED_REQUIRED: "COMPLETED_REQUIRED",
  MOSTLY_COMPLETED: "MOSTLY_COMPLETED",
  PARTIALLY_COMPLETED: "PARTIALLY_COMPLETED",
  NOT_COMPLETED: "NOT_COMPLETED"
} as const;

export type PopsCompletionLevel =
  (typeof POPS_COMPLETION_LEVEL)[keyof typeof POPS_COMPLETION_LEVEL];

export interface PopsWalletTransactionIntent {
  type: "PENDING_REWARD";
  status: PopsWalletDecisionStatus;
  amountMinor: number;
  hold: boolean;
}

export interface PopsRewardDecision {
  id: string;
  privacyReceiptId?: string;
  sessionId: string;
  userId: string;
  campaignId: string;
  contentId: string;
  coinType: string;
  baseAmount: number;
  finalAmount: number;
  decision: PopsRewardDecisionStatus;
  rewardQuality: number;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  holdRequired: boolean;
  holdReason: PopsRewardHoldReason | null;
  reasonCodes: string[];
  walletTransactionIntent: PopsWalletTransactionIntent | null;
  rewardFormulaVersion?: string;
  walletRuleVersion?: string;
  campaignRequirementVersion?: string;
  createdAt: string;
}

export interface PopsRewardDecisionRequest {
  sessionId: string;
  userId: string;
  campaignId: string;
  contentId: string;
  coinType: string;
  baseAmount: number;
  trustTier: number;
  campaignMultiplier: number;
  completionLevel: PopsCompletionLevel;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  proofLevel: number;
  intentConfidenceThreshold: number;
  intentLowConfidenceAction: "DOWNGRADE" | "HOLD" | "DENY";
  isEligible: boolean;
  campaignExpired: boolean;
  isDuplicateAttempt: boolean;
}
