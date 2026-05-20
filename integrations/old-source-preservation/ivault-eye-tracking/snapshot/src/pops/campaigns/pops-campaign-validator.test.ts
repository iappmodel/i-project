import { describe, expect, it } from "vitest";
import {
  POPS_CAMPAIGN_PROOF_PRESET,
  POPS_MANUAL_REVIEW_POLICY,
  POPS_PROOF_LEVEL
} from "./pops-campaign-requirements.types";
import { getCampaignRequirementFromPreset } from "./pops-campaign-requirements.service";
import { validateCampaignRequirements } from "./pops-campaign-validator";

describe("validateCampaignRequirements", () => {
  it("passes a well-formed high value local campaign", () => {
    const requirements = getCampaignRequirementFromPreset(
      "campaign_hi",
      POPS_CAMPAIGN_PROOF_PRESET.HIGH_VALUE_REWARD
    );

    const result = validateCampaignRequirements({
      campaignId: "campaign_hi",
      rewardAmountMinor: 150_000,
      payoutAmountMinor: 150_000,
      campaignType: "LOCAL",
      requirements
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("requires stronger proof for higher rewards", () => {
    const requirements = getCampaignRequirementFromPreset(
      "campaign_low_proof",
      POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW
    );

    const result = validateCampaignRequirements({
      campaignId: "campaign_low_proof",
      rewardAmountMinor: 40_000,
      campaignType: "DIGITAL",
      requirements
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toContain("too low");
  });

  it("requires KYC and manual review where policy demands it", () => {
    const requirements = {
      ...getCampaignRequirementFromPreset(
        "campaign_policy",
        POPS_CAMPAIGN_PROOF_PRESET.HIGH_VALUE_REWARD
      ),
      kycRequired: false,
      manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.DISABLED,
      requiredProofLevel: POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE
    } as const;

    const result = validateCampaignRequirements({
      campaignId: "campaign_policy",
      rewardAmountMinor: 130_000,
      payoutAmountMinor: 130_000,
      campaignType: "LOCAL",
      requirements
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toContain("KYC must be required");
    expect(result.errors.join(" ")).toContain("Manual review must be enabled");
  });

  it("blocks mandatory minor visual presence without explicit policy", () => {
    const requirements = getCampaignRequirementFromPreset(
      "campaign_minor",
      POPS_CAMPAIGN_PROOF_PRESET.CTA_INTENT,
      {
        ageRestriction: 16,
        visualPresenceRequired: true
      }
    );

    const result = validateCampaignRequirements({
      campaignId: "campaign_minor",
      rewardAmountMinor: 2_500,
      campaignType: "DIGITAL",
      allowsMinorVisualPresence: false,
      requirements
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toContain("Visual presence cannot be required for minors");
  });
});
