import type { PopsProofLevel, PopsSessionState } from "./pops.types";

export const POPS_RECOMMENDED_ACTION = {
  CONTINUE_TRACKING: "CONTINUE_TRACKING",
  SHOW_REWARD_PROGRESS: "SHOW_REWARD_PROGRESS",
  PAUSE_VERIFICATION: "PAUSE_VERIFICATION",
  RESUME_VERIFICATION: "RESUME_VERIFICATION",
  REQUIRE_INTERACTION: "REQUIRE_INTERACTION",
  REQUIRE_REVERIFICATION: "REQUIRE_REVERIFICATION",
  DEGRADE_CONFIDENCE: "DEGRADE_CONFIDENCE",
  HOLD_REWARD: "HOLD_REWARD",
  APPROVE_REWARD: "APPROVE_REWARD",
  PARTIAL_REWARD: "PARTIAL_REWARD",
  DENY_REWARD: "DENY_REWARD",
  FLAG_FRAUD: "FLAG_FRAUD",
  UPDATE_TRUST_POSITIVE: "UPDATE_TRUST_POSITIVE",
  UPDATE_TRUST_NEGATIVE: "UPDATE_TRUST_NEGATIVE",
  CREATE_PRIVACY_RECEIPT: "CREATE_PRIVACY_RECEIPT"
} as const;

export type PopsRecommendedAction =
  (typeof POPS_RECOMMENDED_ACTION)[keyof typeof POPS_RECOMMENDED_ACTION];

export const POPS_REWARD_ELIGIBILITY = {
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  ELIGIBLE_PENDING: "ELIGIBLE_PENDING",
  ELIGIBLE_PARTIAL: "ELIGIBLE_PARTIAL",
  ELIGIBLE_FULL: "ELIGIBLE_FULL",
  HELD_FOR_REVIEW: "HELD_FOR_REVIEW",
  DENIED: "DENIED"
} as const;

export type PopsRewardEligibility =
  (typeof POPS_REWARD_ELIGIBILITY)[keyof typeof POPS_REWARD_ELIGIBILITY];

export const POPS_TRUST_IMPACT = {
  NONE: "NONE",
  POSITIVE_LOW: "POSITIVE_LOW",
  POSITIVE_MEDIUM: "POSITIVE_MEDIUM",
  POSITIVE_HIGH: "POSITIVE_HIGH",
  NEGATIVE_LOW: "NEGATIVE_LOW",
  NEGATIVE_MEDIUM: "NEGATIVE_MEDIUM",
  NEGATIVE_HIGH: "NEGATIVE_HIGH"
} as const;

export type PopsTrustImpact = (typeof POPS_TRUST_IMPACT)[keyof typeof POPS_TRUST_IMPACT];

export interface PopsJudgment {
  sessionId: string;
  userId: string;
  sessionState: PopsSessionState;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  rewardEligibility: PopsRewardEligibility;
  trustImpact: PopsTrustImpact;
  recommendedAction: PopsRecommendedAction;
  reasonCodes: string[];
  /** @deprecated Prefer `scoringModelVersion`; kept for legacy rows and `pops_judgments.model_version`. */
  modelVersion: string;
  ruleVersion: string;
  scoringModelVersion?: string;
  fraudModelVersion?: string;
  rewardFormulaVersion?: string;
  privacyPolicyVersion?: string;
  campaignRequirementVersion?: string;
  createdAt: string;
}

export interface PopsScoringResult {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  reasonCodes: string[];
}

export interface PopsDecisionInput extends PopsScoringResult {
  sessionId: string;
  userId: string;
  proofLevel: PopsProofLevel;
  state: PopsSessionState;
}

export interface PopsRewardDecision {
  id: string;
  sessionId: string;
  userId: string;
  proofLevel: PopsProofLevel;
  sessionState: PopsSessionState;
  rewardEligibility: PopsRewardEligibility;
  trustImpact: PopsTrustImpact;
  recommendedAction: PopsRecommendedAction;
  reasonCodes: string[];
  createdAt: string;
}
