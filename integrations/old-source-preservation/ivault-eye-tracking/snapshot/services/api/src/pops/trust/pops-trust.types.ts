import type { PopsRewardDecisionStatus } from "../rewards/pops-reward-decision.types";

export const POPS_TRUST_EVENT_TYPE = {
  VERIFIED_HUMAN_MOMENT: "VERIFIED_HUMAN_MOMENT",
  VERIFIED_ATTENTION_SESSION: "VERIFIED_ATTENTION_SESSION",
  VERIFIED_INTENT_ACTION: "VERIFIED_INTENT_ACTION",
  CLEAN_REWARD_COMPLETION: "CLEAN_REWARD_COMPLETION",
  CLEAN_CAMPAIGN_COMPLETION: "CLEAN_CAMPAIGN_COMPLETION",
  CONSISTENT_DEVICE_PRESENCE: "CONSISTENT_DEVICE_PRESENCE",
  CONSISTENT_ACCOUNT_CONTINUITY: "CONSISTENT_ACCOUNT_CONTINUITY",
  CLEAN_PAYOUT_BEHAVIOR: "CLEAN_PAYOUT_BEHAVIOR",
  LOW_CONFIDENCE_SESSION: "LOW_CONFIDENCE_SESSION",
  REPEATED_DEGRADED_SESSION: "REPEATED_DEGRADED_SESSION",
  SUSPICIOUS_AUTOMATION_PATTERN: "SUSPICIOUS_AUTOMATION_PATTERN",
  IMPOSSIBLE_PROGRESS_PATTERN: "IMPOSSIBLE_PROGRESS_PATTERN",
  DEVICE_INTEGRITY_WARNING: "DEVICE_INTEGRITY_WARNING",
  DUPLICATE_REWARD_ATTEMPT: "DUPLICATE_REWARD_ATTEMPT",
  HIGH_FRAUD_RISK_SESSION: "HIGH_FRAUD_RISK_SESSION",
  IDENTITY_CONTINUITY_BREAK: "IDENTITY_CONTINUITY_BREAK",
  REWARD_ABUSE_PATTERN: "REWARD_ABUSE_PATTERN"
} as const;

export type PopsTrustEventType =
  (typeof POPS_TRUST_EVENT_TYPE)[keyof typeof POPS_TRUST_EVENT_TYPE];

export const POPS_TRUST_SEVERITY = {
  INFO: "INFO",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
} as const;

export type PopsTrustSeverity = (typeof POPS_TRUST_SEVERITY)[keyof typeof POPS_TRUST_SEVERITY];

export const POPS_RECOMMENDED_TRUST_ACTION = {
  NONE: "NONE",
  INCREASE_TRUST_LOW: "INCREASE_TRUST_LOW",
  INCREASE_TRUST_MEDIUM: "INCREASE_TRUST_MEDIUM",
  MONITOR: "MONITOR",
  REDUCE_TRUST_LOW: "REDUCE_TRUST_LOW",
  REDUCE_TRUST_MEDIUM: "REDUCE_TRUST_MEDIUM",
  REDUCE_TRUST_HIGH: "REDUCE_TRUST_HIGH",
  REQUIRE_REVERIFICATION: "REQUIRE_REVERIFICATION",
  REQUIRE_KYC: "REQUIRE_KYC",
  BLOCK_REWARDS_TEMPORARILY: "BLOCK_REWARDS_TEMPORARILY",
  SEND_TO_MANUAL_REVIEW: "SEND_TO_MANUAL_REVIEW"
} as const;

export type PopsRecommendedTrustAction =
  (typeof POPS_RECOMMENDED_TRUST_ACTION)[keyof typeof POPS_RECOMMENDED_TRUST_ACTION];

export interface PopsTrustImpact {
  id: string;
  privacyReceiptId?: string;
  userId: string;
  sessionId: string;
  source: string;
  eventType: PopsTrustEventType;
  weight: number;
  confidence: number;
  severity: PopsTrustSeverity;
  reasonCodes: string[];
  createdAt: string;
}

export type TrustEvent = PopsTrustImpact;

export interface UserTrustTier {
  level: number;
  label: string;
}

export interface UserTrustRisk {
  riskScore: number;
  riskStatus: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface RewardHoldProfile {
  holdRequired: boolean;
  profile: "NONE" | "STANDARD" | "STRICT";
}

export interface PayoutEligibilityProfile {
  eligible: boolean;
  reasonCodes: string[];
}

export interface PopsTrustContext {
  trustTier: UserTrustTier;
  risk: UserTrustRisk;
  rewardHoldProfile: RewardHoldProfile;
  payoutEligibilityProfile: PayoutEligibilityProfile;
}

export interface CreatePopsTrustEventInput {
  userId: string;
  sessionId: string;
  source: string;
  eventType: PopsTrustEventType;
  weight: number;
  confidence: number;
  severity: PopsTrustSeverity;
  reasonCodes: string[];
}

export interface PopsTrustIntegration {
  createTrustEvent(input: CreatePopsTrustEventInput): Promise<TrustEvent>;
  getUserTrustTier(userId: string): Promise<UserTrustTier>;
  getUserTrustRisk(userId: string): Promise<UserTrustRisk>;
}

export interface PopsRewardTrustEvaluationInput {
  userId: string;
  sessionId: string;
  source: string;
  decision: PopsRewardDecisionStatus;
  fraudRisk: number;
  confidence: number;
  reasonCodes: string[];
  trustContext: PopsTrustContext;
  createdAt?: string;
}

export interface PopsTrustImpactResult {
  trustEvent: TrustEvent;
  trustReasonCodes: string[];
  recommendedTrustAction: PopsRecommendedTrustAction;
}
