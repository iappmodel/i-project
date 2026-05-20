import { describe, expect, it } from "vitest";
import { PopsConfigService } from "./pops-config.service";
import { POPS_FEATURE_FLAG } from "./pops-feature-flags";
import {
  resolveDisabledBehavior,
  resolvePrivacyReceiptReleaseGuard,
  resolveProofPolicyWhenVisualDisabled,
  resolveRewardDecisionBehavior
} from "./pops-rollout-rules";

const baseContext = {
  environment: "development" as const,
  region: "GLOBAL" as const,
  appVersion: "1.2.3",
  platform: "ios" as const,
  userCohort: "general" as const,
  ageBand: "25_34" as const,
  campaignType: "DIGITAL" as const,
  proofLevel: "LEVEL_2_ATTENTION" as const,
  trustTier: "MEDIUM" as const,
  riskTier: "LOW" as const
};

describe("PopsConfigService", () => {
  it("applies MVP rollout defaults", () => {
    const service = new PopsConfigService("MVP");
    const resolved = service.resolve(baseContext);

    expect(resolved.config.rewardDecisionEnabled).toBe(true);
    expect(resolved.config.walletPendingEnabled).toBe(true);
    expect(resolved.config.privacyReceiptRequired).toBe(true);
    expect(resolved.featureFlags[POPS_FEATURE_FLAG.POPS_VISUAL_PRESENCE_ENABLED]).toBe(false);
    expect(resolved.featureFlags[POPS_FEATURE_FLAG.POPS_AUDIO_FEATURES_ENABLED]).toBe(false);
    expect(resolved.featureFlags[POPS_FEATURE_FLAG.POPS_STRICT_FRAUD_MODE_ENABLED]).toBe(false);
  });

  it("enables beta analytics and admin review flags", () => {
    const service = new PopsConfigService("BETA");
    const resolved = service.resolve(baseContext);

    expect(resolved.featureFlags[POPS_FEATURE_FLAG.POPS_CREATOR_ANALYTICS_ENABLED]).toBe(true);
    expect(resolved.featureFlags[POPS_FEATURE_FLAG.POPS_BRAND_ANALYTICS_ENABLED]).toBe(true);
    expect(resolved.featureFlags[POPS_FEATURE_FLAG.POPS_ADMIN_REVIEW_ENABLED]).toBe(true);
    expect(resolved.featureFlags[POPS_FEATURE_FLAG.POPS_VISUAL_PRESENCE_ENABLED]).toBe(false);
  });

  it("enables strict fraud mode for high risk contexts by default", () => {
    const service = new PopsConfigService("MVP");

    const lowRisk = service.resolve(baseContext);
    const highRisk = service.resolve({
      ...baseContext,
      riskTier: "HIGH"
    });

    expect(lowRisk.config.strictFraudMode).toBe(false);
    expect(highRisk.config.strictFraudMode).toBe(true);
  });

  it("enables visual presence for opt-in campaigns in beta", () => {
    const service = new PopsConfigService("BETA");
    const regularCampaign = service.resolve(baseContext);
    const optInCampaign = service.resolve({
      ...baseContext,
      campaignType: "OPT_IN_VISUAL"
    });

    expect(regularCampaign.config.visualPresenceAllowed).toBe(false);
    expect(optInCampaign.config.visualPresenceAllowed).toBe(true);
  });
});

describe("P.O.P.S behavior guards", () => {
  it("uses fallback verification when P.O.P.S is disabled", () => {
    const behavior = resolveDisabledBehavior(false);

    expect(behavior.campaignsCanRequirePops).toBe(false);
    expect(behavior.rewardFlowMode).toBe("fallback_verification");
    expect(behavior.shouldCreatePrivacyReceipt).toBe(false);
  });

  it("allows capture but blocks approvals when reward decisions are disabled", () => {
    const behavior = resolveRewardDecisionBehavior(false);

    expect(behavior.captureAllowed).toBe(true);
    expect(behavior.rewardApprovalAllowed).toBe(false);
  });

  it("blocks reward release when privacy receipt is required and creation fails", () => {
    const guard = resolvePrivacyReceiptReleaseGuard({
      privacyReceiptRequired: true,
      privacyReceiptCreationFailed: true
    });
    expect(guard.shouldBlockRewardRelease).toBe(true);
    expect(guard.reason).toBe("PRIVACY_RECEIPT_REQUIRED_AND_FAILED");
  });

  it("downgrades proof level when visual presence is disabled and downgrade mode is active", () => {
    const proofResult = resolveProofPolicyWhenVisualDisabled({
      visualPresenceEnabled: false,
      requiredProofLevel: "LEVEL_4_IDENTITY_CONTINUITY",
      mode: "downgrade"
    });

    expect(proofResult.allowed).toBe(true);
    expect(proofResult.effectiveProofLevel).toBe("LEVEL_3_INTENT");
    expect(proofResult.reason).toBe("VISUAL_REQUIRED_PROOF_DOWNGRADED");
  });
});
