import {
  POPS_MANUAL_REVIEW_POLICY,
  POPS_PROOF_LEVEL,
  type PopsCampaignVerificationRequirement,
  type PopsProofLevel
} from "./pops-campaign-requirements.types";

const KYC_PAYOUT_THRESHOLD_MINOR = 100_000;

const proofLevelOrder: Record<PopsProofLevel, number> = {
  LEVEL_1_SESSION: 1,
  LEVEL_2_ATTENTION: 2,
  LEVEL_3_INTENT: 3,
  LEVEL_4_IDENTITY_CONTINUITY: 4,
  LEVEL_5_HIGH_VALUE: 5
};

export interface PopsCampaignValidationInput {
  campaignId: string;
  rewardAmountMinor: number;
  payoutAmountMinor?: number;
  campaignType: "DIGITAL" | "LOCAL";
  requiresAgeRestriction?: boolean;
  allowsMinorVisualPresence?: boolean;
  requirements: PopsCampaignVerificationRequirement;
}

export interface PopsCampaignValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function recommendedProofLevelForReward(rewardAmountMinor: number): PopsProofLevel {
  if (rewardAmountMinor >= 100_000) return POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE;
  if (rewardAmountMinor >= 20_000) return POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY;
  if (rewardAmountMinor >= 5_000) return POPS_PROOF_LEVEL.LEVEL_3_INTENT;
  if (rewardAmountMinor >= 1_000) return POPS_PROOF_LEVEL.LEVEL_2_ATTENTION;
  return POPS_PROOF_LEVEL.LEVEL_1_SESSION;
}

export function validateCampaignRequirements(
  campaign: PopsCampaignValidationInput
): PopsCampaignValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const payoutAmount = campaign.payoutAmountMinor ?? campaign.rewardAmountMinor;
  const requirements = campaign.requirements;

  const recommendedProof = recommendedProofLevelForReward(campaign.rewardAmountMinor);
  if (
    proofLevelOrder[requirements.requiredProofLevel] <
    proofLevelOrder[recommendedProof]
  ) {
    errors.push(
      `Proof level ${requirements.requiredProofLevel} is too low for reward amount; minimum recommended is ${recommendedProof}.`
    );
  }

  if (campaign.requiresAgeRestriction && requirements.ageRestriction == null) {
    errors.push("Age restriction must be set for this campaign.");
  }

  if (payoutAmount >= KYC_PAYOUT_THRESHOLD_MINOR && requirements.kycRequired === false) {
    errors.push("KYC must be required (or conditional) when payout exceeds threshold.");
  }

  if (campaign.campaignType !== "LOCAL" && requirements.locationProofRequired === true) {
    errors.push("Location proof can only be required for local campaigns.");
  }

  if (
    requirements.ageRestriction != null &&
    requirements.ageRestriction < 18 &&
    requirements.visualPresenceRequired === true &&
    !campaign.allowsMinorVisualPresence
  ) {
    errors.push("Visual presence cannot be required for minors without explicit policy allowance.");
  }

  if (
    requirements.requiredProofLevel === POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE &&
    requirements.manualReviewPolicy !== POPS_MANUAL_REVIEW_POLICY.ENABLED
  ) {
    errors.push("Manual review must be enabled for high-value campaigns.");
  }

  if (requirements.visualPresenceRequired === true) {
    warnings.push(
      "Visual presence increases fraud resistance but adds friction. Keep optional unless reward value justifies it."
    );
  }

  if (requirements.requiredProofLevel === POPS_PROOF_LEVEL.LEVEL_1_SESSION) {
    warnings.push("Lower proof settings are easier for participation but increase fraud risk.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
