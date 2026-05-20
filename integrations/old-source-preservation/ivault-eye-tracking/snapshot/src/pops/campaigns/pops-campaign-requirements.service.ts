import {
  POPS_CAMPAIGN_PROOF_PRESET,
  POPS_MANUAL_REVIEW_POLICY,
  POPS_PROOF_LEVEL,
  POPS_REWARD_HOLD_POLICY,
  type PopsCampaignProofPreset,
  type PopsCampaignProofPresetOption,
  type PopsCampaignVerificationRequirement
} from "./pops-campaign-requirements.types";

const DEFAULT_MINIMUM_DURATION_MS = 30_000;

export const POPS_CAMPAIGN_PROOF_PRESETS: Record<
  PopsCampaignProofPreset,
  PopsCampaignProofPresetOption
> = {
  BASIC_VIEW: {
    preset: POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW,
    label: "Basic Session",
    headline: "Good for low-value awareness.",
    description:
      "Good for low-value awareness. Verifies app activity, content progress, and session continuity.",
    requiredSignals: ["Session continuity", "Content progress", "Basic interaction telemetry"],
    expectedUserFriction: "Low",
    fraudResistance: "Low",
    bestUseCase: "Top-of-funnel awareness campaigns",
    requirements: {
      requiredProofLevel: POPS_PROOF_LEVEL.LEVEL_1_SESSION,
      minimumDurationMs: DEFAULT_MINIMUM_DURATION_MS,
      minimumCompletionPct: 50,
      minimumPresenceConfidence: 0.55,
      minimumAttentionConfidence: 0.5,
      minimumIntentConfidence: 0.45,
      maximumFraudRisk: 0.45,
      visualPresenceRequired: false,
      interactionRequired: false,
      ctaRequired: false,
      locationProofRequired: false,
      merchantProofRequired: false,
      identityContinuityRequired: false,
      kycRequired: false,
      ageRestriction: null,
      rewardHoldPolicy: POPS_REWARD_HOLD_POLICY.RELEASE_IMMEDIATE,
      manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.DISABLED
    }
  },
  PAID_WATCH: {
    preset: POPS_CAMPAIGN_PROOF_PRESET.PAID_WATCH,
    label: "Verified Attention",
    headline: "Good for paid watch campaigns.",
    description:
      "Good for paid watch campaigns. Adds attention quality and stronger session confidence.",
    requiredSignals: ["Attention confidence", "Progress quality", "Session continuity"],
    expectedUserFriction: "Medium",
    fraudResistance: "Medium",
    bestUseCase: "Paid watch and completion campaigns",
    requirements: {
      requiredProofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
      minimumDurationMs: 45_000,
      minimumCompletionPct: 90,
      minimumPresenceConfidence: 0.62,
      minimumAttentionConfidence: 0.65,
      minimumIntentConfidence: 0.5,
      maximumFraudRisk: 0.35,
      visualPresenceRequired: "optional",
      interactionRequired: false,
      ctaRequired: false,
      locationProofRequired: false,
      merchantProofRequired: false,
      identityContinuityRequired: false,
      kycRequired: false,
      ageRestriction: null,
      rewardHoldPolicy: POPS_REWARD_HOLD_POLICY.HOLD_UNTIL_VERIFIED,
      manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.CONDITIONAL
    }
  },
  CTA_INTENT: {
    preset: POPS_CAMPAIGN_PROOF_PRESET.CTA_INTENT,
    label: "Intent Proof",
    headline: "Good for deliberate actions.",
    description:
      "Good for clicks, follows, saves, signups, and purchase intent. Verifies deliberate action.",
    requiredSignals: ["Intent confidence", "Interaction verification", "CTA execution"],
    expectedUserFriction: "Medium",
    fraudResistance: "High",
    bestUseCase: "CTA and conversion intent campaigns",
    requirements: {
      requiredProofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
      minimumDurationMs: 35_000,
      minimumCompletionPct: 75,
      minimumPresenceConfidence: 0.63,
      minimumAttentionConfidence: 0.62,
      minimumIntentConfidence: 0.7,
      maximumFraudRisk: 0.3,
      visualPresenceRequired: "optional",
      interactionRequired: true,
      ctaRequired: true,
      locationProofRequired: false,
      merchantProofRequired: false,
      identityContinuityRequired: false,
      kycRequired: false,
      ageRestriction: null,
      rewardHoldPolicy: POPS_REWARD_HOLD_POLICY.HOLD_UNTIL_VERIFIED,
      manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.CONDITIONAL
    }
  },
  LOCAL_VISIT: {
    preset: POPS_CAMPAIGN_PROOF_PRESET.LOCAL_VISIT,
    label: "Real-World Proof",
    headline: "Good for local visit verification.",
    description:
      "Good for visits, scans, and merchant actions. Uses location class, QR/NFC, and dwell logic.",
    requiredSignals: ["Location proof", "Presence confidence", "Merchant scan or dwell evidence"],
    expectedUserFriction: "High",
    fraudResistance: "High",
    bestUseCase: "Store visit, check-in, and local merchant actions",
    requirements: {
      requiredProofLevel: POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY,
      minimumDurationMs: 60_000,
      minimumCompletionPct: 70,
      minimumPresenceConfidence: 0.75,
      minimumAttentionConfidence: 0.6,
      minimumIntentConfidence: 0.65,
      maximumFraudRisk: 0.22,
      visualPresenceRequired: "optional",
      interactionRequired: true,
      ctaRequired: "conditional",
      locationProofRequired: true,
      merchantProofRequired: "optional",
      identityContinuityRequired: true,
      kycRequired: "conditional",
      ageRestriction: null,
      rewardHoldPolicy: POPS_REWARD_HOLD_POLICY.HOLD_24H,
      manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.CONDITIONAL
    }
  },
  HIGH_VALUE_REWARD: {
    preset: POPS_CAMPAIGN_PROOF_PRESET.HIGH_VALUE_REWARD,
    label: "High-Value Proof",
    headline: "Good for larger payouts.",
    description:
      "Good for larger payouts. Requires strong continuity, low fraud risk, and possible KYC.",
    requiredSignals: ["Identity continuity", "Low fraud risk", "Enhanced trust and payout checks"],
    expectedUserFriction: "High",
    fraudResistance: "Very High",
    bestUseCase: "Large reward payouts and high-risk categories",
    requirements: {
      requiredProofLevel: POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE,
      minimumDurationMs: 90_000,
      minimumCompletionPct: 80,
      minimumPresenceConfidence: 0.8,
      minimumAttentionConfidence: 0.72,
      minimumIntentConfidence: 0.75,
      maximumFraudRisk: 0.15,
      visualPresenceRequired: "conditional",
      interactionRequired: true,
      ctaRequired: true,
      locationProofRequired: "conditional",
      merchantProofRequired: "conditional",
      identityContinuityRequired: true,
      kycRequired: "conditional",
      ageRestriction: 18,
      rewardHoldPolicy: POPS_REWARD_HOLD_POLICY.HOLD_72H,
      manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.ENABLED
    }
  }
};

export function getCampaignRequirementFromPreset(
  campaignId: string,
  preset: PopsCampaignProofPreset,
  overrides?: Partial<PopsCampaignVerificationRequirement>
): PopsCampaignVerificationRequirement {
  const base = POPS_CAMPAIGN_PROOF_PRESETS[preset];
  return {
    campaignId,
    ...base.requirements,
    ...overrides
  };
}

export function getCampaignProofPresetOptions(): PopsCampaignProofPresetOption[] {
  return Object.values(POPS_CAMPAIGN_PROOF_PRESETS);
}
