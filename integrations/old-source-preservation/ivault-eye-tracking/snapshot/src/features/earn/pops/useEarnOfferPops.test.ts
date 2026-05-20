import { describe, expect, it, vi } from "vitest";
import {
  EARN_OFFER_PROOF_LEVEL,
  EARN_POPS_COMPLETION_STATE,
  EARN_POPS_PREFLIGHT_STATUS,
  type EarnOfferPopsCampaign,
  type EarnOfferPopsUserContext
} from "./earn-pops-rules";

vi.mock(
  "react",
  () => ({
    useMemo: <T>(factory: () => T) => factory()
  }),
  { virtual: true }
);

const campaign: EarnOfferPopsCampaign = {
  campaignId: "campaign_use_hook",
  rewardAmountMinor: 550,
  currency: "USD",
  estimatedTimeMinutes: 4,
  budgetAvailable: true,
  minimumAge: null,
  allowedRegions: ["US"],
  minimumTrustTier: 1,
  devicesAllowed: ["ios"],
  permissionsRequired: [],
  proofRequirements: {
    proofLevel: EARN_OFFER_PROOF_LEVEL.INTENT_PROOF,
    requiredActions: ["Engage content", "Complete CTA"],
    visualPresenceNeeded: false,
    locationProofNeeded: false,
    kycMayBeRequired: false,
    pendingReleaseExpectation: "Pending release follows normal verification."
  }
};

const user: EarnOfferPopsUserContext = {
  userAge: 26,
  region: "US",
  completedCampaignIds: [],
  hasKyc: true,
  trustTier: 2,
  deviceType: "ios",
  grantedPermissions: []
};

describe("buildEarnOfferPopsModel", () => {
  it("builds offer detail summary and preflight status", async () => {
    const { buildEarnOfferPopsModel } = await import("./useEarnOfferPops");
    const model = buildEarnOfferPopsModel({
      campaign,
      userContext: user,
      checkpoints: {
        sessionStarted: true,
        taskRunning: true,
        checkpointsUpdating: true,
        completionTriggered: false,
        rewardDecisionReturned: false,
        walletPendingUpdated: false
      },
      completionState: EARN_POPS_COMPLETION_STATE.PENDING_REVIEW
    });

    expect(model.preflight.status).toBe(EARN_POPS_PREFLIGHT_STATUS.ELIGIBLE);
    expect(model.summary.rewardAmount).toBe("$5.50");
    expect(model.summary.estimatedTime).toBe("4 min");
    expect(model.canStart).toBe(true);
    expect(model.verificationSteps).toHaveLength(10);
  });

  it("blocks offer start when trust is too low", async () => {
    const { buildEarnOfferPopsModel } = await import("./useEarnOfferPops");
    const model = buildEarnOfferPopsModel({
      campaign: { ...campaign, minimumTrustTier: 5 },
      userContext: user,
      checkpoints: {
        sessionStarted: false,
        taskRunning: false,
        checkpointsUpdating: false,
        completionTriggered: false,
        rewardDecisionReturned: false,
        walletPendingUpdated: false
      },
      completionState: null
    });

    expect(model.preflight.status).toBe(EARN_POPS_PREFLIGHT_STATUS.TRUST_TOO_LOW);
    expect(model.canStart).toBe(false);
  });
});
