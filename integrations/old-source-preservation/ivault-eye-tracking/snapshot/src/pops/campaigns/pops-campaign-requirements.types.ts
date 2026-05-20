export const POPS_PROOF_LEVEL = {
  LEVEL_0_NONE: "LEVEL_0_NONE",
  LEVEL_1_SESSION: "LEVEL_1_SESSION",
  LEVEL_2_ATTENTION: "LEVEL_2_ATTENTION",
  LEVEL_3_INTENT: "LEVEL_3_INTENT",
  LEVEL_4_IDENTITY_CONTINUITY: "LEVEL_4_IDENTITY_CONTINUITY",
  LEVEL_5_HIGH_VALUE: "LEVEL_5_HIGH_VALUE"
} as const;

export type PopsProofLevel = (typeof POPS_PROOF_LEVEL)[keyof typeof POPS_PROOF_LEVEL];

export type PopsRequirementToggle = boolean | "optional" | "conditional";

export const POPS_REWARD_HOLD_POLICY = {
  RELEASE_IMMEDIATE: "RELEASE_IMMEDIATE",
  HOLD_UNTIL_VERIFIED: "HOLD_UNTIL_VERIFIED",
  HOLD_24H: "HOLD_24H",
  HOLD_72H: "HOLD_72H",
  MANUAL_RELEASE: "MANUAL_RELEASE"
} as const;

export type PopsRewardHoldPolicy =
  (typeof POPS_REWARD_HOLD_POLICY)[keyof typeof POPS_REWARD_HOLD_POLICY];

export const POPS_MANUAL_REVIEW_POLICY = {
  DISABLED: "DISABLED",
  CONDITIONAL: "CONDITIONAL",
  ENABLED: "ENABLED"
} as const;

export type PopsManualReviewPolicy =
  (typeof POPS_MANUAL_REVIEW_POLICY)[keyof typeof POPS_MANUAL_REVIEW_POLICY];

export interface PopsCampaignVerificationRequirement {
  campaignId: string;
  requiredProofLevel: PopsProofLevel;
  minimumDurationMs: number;
  minimumCompletionPct: number;
  minimumPresenceConfidence: number;
  minimumAttentionConfidence: number;
  minimumIntentConfidence: number;
  maximumFraudRisk: number;
  visualPresenceRequired: PopsRequirementToggle;
  interactionRequired: PopsRequirementToggle;
  ctaRequired: PopsRequirementToggle;
  locationProofRequired: PopsRequirementToggle;
  merchantProofRequired: PopsRequirementToggle;
  identityContinuityRequired: PopsRequirementToggle;
  kycRequired: PopsRequirementToggle;
  ageRestriction: number | null;
  rewardHoldPolicy: PopsRewardHoldPolicy;
  manualReviewPolicy: PopsManualReviewPolicy;
}

export const POPS_CAMPAIGN_PROOF_PRESET = {
  BASIC_VIEW: "BASIC_VIEW",
  PAID_WATCH: "PAID_WATCH",
  CTA_INTENT: "CTA_INTENT",
  LOCAL_VISIT: "LOCAL_VISIT",
  HIGH_VALUE_REWARD: "HIGH_VALUE_REWARD"
} as const;

export type PopsCampaignProofPreset =
  (typeof POPS_CAMPAIGN_PROOF_PRESET)[keyof typeof POPS_CAMPAIGN_PROOF_PRESET];

export interface PopsCampaignProofPresetOption {
  preset: PopsCampaignProofPreset;
  label: string;
  headline: string;
  description: string;
  requiredSignals: string[];
  expectedUserFriction: "Low" | "Medium" | "High";
  fraudResistance: "Low" | "Medium" | "High" | "Very High";
  bestUseCase: string;
  requirements: Omit<PopsCampaignVerificationRequirement, "campaignId">;
}
