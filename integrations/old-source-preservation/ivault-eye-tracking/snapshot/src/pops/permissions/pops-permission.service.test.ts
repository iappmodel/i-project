import { describe, expect, it } from "vitest";
import { getCampaignRequirementFromPreset } from "../campaigns/pops-campaign-requirements.service";
import { POPS_CAMPAIGN_PROOF_PRESET } from "../campaigns/pops-campaign-requirements.types";
import { getRegionPolicy } from "../config/pops-region-policy";
import { POPS_PROOF_LEVEL, POPS_SESSION_TYPE } from "../../../services/api/src/pops/types/pops.types";
import { POPS_PERMISSION_TYPE } from "./pops-permission.types";
import { getRequiredPermissionsForMoment, runPermissionPreflight } from "./pops-permission.service";

const baseInput = () => ({
  proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION as const,
  campaignRequirements: null,
  rewardValue: { amountMinor: 100, currencyCode: "ICOIN" },
  ageBand: "25_34" as const,
  regionPolicy: getRegionPolicy("US")
});

describe("getRequiredPermissionsForMoment", () => {
  it("requires screen activity and content progress for sponsored watch", () => {
    const list = getRequiredPermissionsForMoment({
      ...baseInput(),
      sessionType: POPS_SESSION_TYPE.SPONSORED_WATCH
    });
    const types = list.map((r) => r.permissionType);
    expect(types).toContain(POPS_PERMISSION_TYPE.SCREEN_ACTIVITY);
    expect(types).toContain(POPS_PERMISSION_TYPE.CONTENT_PROGRESS);
    const content = list.find((r) => r.permissionType === POPS_PERMISSION_TYPE.CONTENT_PROGRESS);
    expect(content?.required).toBe(true);
  });

  it("includes wallet security signals for withdrawal review", () => {
    const list = getRequiredPermissionsForMoment({
      ...baseInput(),
      sessionType: POPS_SESSION_TYPE.WITHDRAWAL_REVIEW,
      proofLevel: POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY
    });
    const types = list.map((r) => r.permissionType);
    expect(types).toContain(POPS_PERMISSION_TYPE.DEVICE_INTEGRITY);
    expect(types).toContain(POPS_PERMISSION_TYPE.ACCOUNT_CONTINUITY);
  });

  it("merges campaign location requirements when region allows location", () => {
    const campaign = getCampaignRequirementFromPreset("cmp_1", POPS_CAMPAIGN_PROOF_PRESET.LOCAL_VISIT);
    const list = getRequiredPermissionsForMoment({
      ...baseInput(),
      sessionType: POPS_SESSION_TYPE.BRAND_CAMPAIGN,
      campaignRequirements: campaign,
      regionPolicy: getRegionPolicy("US")
    });
    const loc = list.find((r) => r.permissionType === POPS_PERMISSION_TYPE.LOCATION_CLASS);
    expect(loc?.required).toBe(true);
  });

  it("does not emit precise location as required for under-13 when it would otherwise be required", () => {
    const list = getRequiredPermissionsForMoment({
      ...baseInput(),
      sessionType: POPS_SESSION_TYPE.NFC_MERCHANT,
      proofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
      ageBand: "U13",
      regionPolicy: getRegionPolicy("US")
    });
    const precise = list.find((r) => r.permissionType === POPS_PERMISSION_TYPE.PRECISE_LOCATION);
    expect(precise).toBeDefined();
    expect(precise?.required).toBe(false);
  });

  it("adds optional integrity context for very high reward amounts", () => {
    const list = getRequiredPermissionsForMoment({
      ...baseInput(),
      sessionType: POPS_SESSION_TYPE.FEED_VIEW,
      rewardValue: { amountMinor: 500_000, currencyCode: "USD" }
    });
    const integrity = list.find((r) => r.permissionType === POPS_PERMISSION_TYPE.DEVICE_INTEGRITY);
    expect(integrity).toBeDefined();
    expect(integrity?.required).toBe(false);
  });
});

describe("runPermissionPreflight", () => {
  it("blocks start when location is required by policy but region disallows location", () => {
    const campaign = getCampaignRequirementFromPreset("cmp_eu", POPS_CAMPAIGN_PROOF_PRESET.LOCAL_VISIT);
    const result = runPermissionPreflight({
      sessionType: POPS_SESSION_TYPE.BRAND_CAMPAIGN,
      proofLevel: POPS_PROOF_LEVEL.LEVEL_3_INTENT,
      campaignRequirements: campaign,
      rewardValue: { amountMinor: 50, currencyCode: "ICOIN" },
      ageBand: "25_34",
      regionPolicy: getRegionPolicy("EU"),
      permissionStatuses: {
        [POPS_PERMISSION_TYPE.SCREEN_ACTIVITY]: "GRANTED",
        [POPS_PERMISSION_TYPE.CONTENT_PROGRESS]: "GRANTED"
      }
    });
    expect(result.canStart).toBe(false);
    expect(result.userVisibleMessage.length).toBeGreaterThan(10);
  });

  it("passes when required permissions are granted", () => {
    const result = runPermissionPreflight({
      ...baseInput(),
      sessionType: POPS_SESSION_TYPE.SPONSORED_WATCH,
      permissionStatuses: {
        [POPS_PERMISSION_TYPE.SCREEN_ACTIVITY]: "GRANTED",
        [POPS_PERMISSION_TYPE.CONTENT_PROGRESS]: "GRANTED"
      }
    });
    expect(result.canStart).toBe(true);
    expect(result.missingRequiredPermissions).toEqual([]);
  });

  it("fails when a required permission is denied", () => {
    const result = runPermissionPreflight({
      ...baseInput(),
      sessionType: POPS_SESSION_TYPE.SPONSORED_WATCH,
      permissionStatuses: {
        [POPS_PERMISSION_TYPE.SCREEN_ACTIVITY]: "DENIED",
        [POPS_PERMISSION_TYPE.CONTENT_PROGRESS]: "GRANTED"
      }
    });
    expect(result.canStart).toBe(false);
    expect(result.missingRequiredPermissions).toContain(POPS_PERMISSION_TYPE.SCREEN_ACTIVITY);
  });
});
