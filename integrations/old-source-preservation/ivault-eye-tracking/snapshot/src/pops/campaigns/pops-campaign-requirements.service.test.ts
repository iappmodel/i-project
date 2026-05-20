import { describe, expect, it } from "vitest";
import {
  POPS_CAMPAIGN_PROOF_PRESET,
  POPS_PROOF_LEVEL
} from "./pops-campaign-requirements.types";
import {
  POPS_CAMPAIGN_PROOF_PRESETS,
  getCampaignProofPresetOptions,
  getCampaignRequirementFromPreset
} from "./pops-campaign-requirements.service";

describe("pops campaign requirements presets", () => {
  it("maps BASIC_VIEW to session proof defaults", () => {
    const requirement = getCampaignRequirementFromPreset(
      "campaign_1",
      POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW
    );

    expect(requirement.campaignId).toBe("campaign_1");
    expect(requirement.requiredProofLevel).toBe(POPS_PROOF_LEVEL.LEVEL_1_SESSION);
    expect(requirement.minimumCompletionPct).toBe(50);
    expect(requirement.visualPresenceRequired).toBe(false);
    expect(requirement.interactionRequired).toBe(false);
  });

  it("maps HIGH_VALUE_REWARD to strongest controls", () => {
    const requirement = getCampaignRequirementFromPreset(
      "campaign_2",
      POPS_CAMPAIGN_PROOF_PRESET.HIGH_VALUE_REWARD
    );

    expect(requirement.requiredProofLevel).toBe(POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE);
    expect(requirement.maximumFraudRisk).toBe(0.15);
    expect(requirement.identityContinuityRequired).toBe(true);
    expect(requirement.kycRequired).toBe("conditional");
  });

  it("returns all preset options for builder", () => {
    const options = getCampaignProofPresetOptions();
    expect(options).toHaveLength(5);
    expect(options.map((option) => option.preset)).toEqual(
      expect.arrayContaining(Object.keys(POPS_CAMPAIGN_PROOF_PRESETS))
    );
  });
});
