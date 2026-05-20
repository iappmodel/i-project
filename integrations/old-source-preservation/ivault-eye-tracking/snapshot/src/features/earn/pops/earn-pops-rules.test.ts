import { describe, expect, it } from "vitest";
import {
  EARN_OFFER_PROOF_LEVEL,
  EARN_POPS_PREFLIGHT_STATUS,
  type EarnOfferCheckpointState,
  type EarnOfferPopsCampaign,
  type EarnOfferPopsUserContext,
  buildEarnOfferVerificationSteps,
  evaluateEarnOfferPreflight
} from "./earn-pops-rules";

const campaign: EarnOfferPopsCampaign = {
  campaignId: "campaign_stage19",
  rewardAmountMinor: 1250,
  currency: "USD",
  estimatedTimeMinutes: 7,
  budgetAvailable: true,
  minimumAge: 18,
  allowedRegions: ["US", "CA"],
  minimumTrustTier: 3,
  devicesAllowed: ["ios", "android"],
  permissionsRequired: ["notifications"],
  proofRequirements: {
    proofLevel: EARN_OFFER_PROOF_LEVEL.VERIFIED_ATTENTION,
    requiredActions: ["Open offer", "Complete watch session"],
    visualPresenceNeeded: true,
    locationProofNeeded: false,
    kycMayBeRequired: false,
    pendingReleaseExpectation: "Release expected after verification checks."
  }
};

const user: EarnOfferPopsUserContext = {
  userAge: 21,
  region: "US",
  completedCampaignIds: [],
  hasKyc: true,
  trustTier: 4,
  deviceType: "ios",
  grantedPermissions: ["notifications"]
};

describe("evaluateEarnOfferPreflight", () => {
  it("returns ELIGIBLE when all preflight checks pass", () => {
    const result = evaluateEarnOfferPreflight(campaign, user);
    expect(result.status).toBe(EARN_POPS_PREFLIGHT_STATUS.ELIGIBLE);
    expect(result.blockingReasons).toHaveLength(0);
  });

  it("returns KYC_REQUIRED for campaigns that may require KYC", () => {
    const result = evaluateEarnOfferPreflight(
      {
        ...campaign,
        proofRequirements: {
          ...campaign.proofRequirements,
          kycMayBeRequired: true
        }
      },
      { ...user, hasKyc: false }
    );
    expect(result.status).toBe(EARN_POPS_PREFLIGHT_STATUS.KYC_REQUIRED);
  });

  it("returns PERMISSION_REQUIRED when permission is missing", () => {
    const result = evaluateEarnOfferPreflight(campaign, {
      ...user,
      grantedPermissions: []
    });
    expect(result.status).toBe(EARN_POPS_PREFLIGHT_STATUS.PERMISSION_REQUIRED);
    expect(result.blockingReasons).toContain("notifications");
  });
});

describe("buildEarnOfferVerificationSteps", () => {
  it("marks the final wallet step complete when pipeline finishes", () => {
    const checkpoints: EarnOfferCheckpointState = {
      sessionStarted: true,
      taskRunning: true,
      checkpointsUpdating: true,
      completionTriggered: true,
      rewardDecisionReturned: true,
      walletPendingUpdated: true
    };
    const steps = buildEarnOfferVerificationSteps(checkpoints);
    expect(steps).toHaveLength(10);
    expect(steps[9].completed).toBe(true);
  });
});
