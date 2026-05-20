import {
  POPS_FEATURE_FLAG,
  createDefaultFeatureFlags,
  type PopsFeatureFlagState
} from "./pops-feature-flags";
import type {
  PopsConfig,
  PopsDisabledBehavior,
  PopsProofLevel,
  PopsProofPolicyResult,
  PopsReleaseGuardResult,
  PopsRewardDecisionBehavior,
  PopsRolloutStage
} from "./pops-config.types";

const proofOrder: Record<PopsProofLevel, number> = {
  LEVEL_1_SESSION: 1,
  LEVEL_2_ATTENTION: 2,
  LEVEL_3_INTENT: 3,
  LEVEL_4_IDENTITY_CONTINUITY: 4,
  LEVEL_5_HIGH_VALUE: 5
};

const proofByOrder: Record<number, PopsProofLevel> = {
  1: "LEVEL_1_SESSION",
  2: "LEVEL_2_ATTENTION",
  3: "LEVEL_3_INTENT",
  4: "LEVEL_4_IDENTITY_CONTINUITY",
  5: "LEVEL_5_HIGH_VALUE"
};

export function getStageFeatureFlags(stage: PopsRolloutStage): PopsFeatureFlagState {
  const flags = createDefaultFeatureFlags(false);

  flags[POPS_FEATURE_FLAG.POPS_ENABLED] = true;
  flags[POPS_FEATURE_FLAG.POPS_FEED_TRACKING_ENABLED] = true;
  flags[POPS_FEATURE_FLAG.POPS_EARN_TRACKING_ENABLED] = true;
  flags[POPS_FEATURE_FLAG.POPS_REWARD_DECISIONS_ENABLED] = true;
  flags[POPS_FEATURE_FLAG.POPS_PRIVACY_RECEIPTS_ENABLED] = true;
  flags[POPS_FEATURE_FLAG.POPS_WALLET_PENDING_ENABLED] = true;
  flags[POPS_FEATURE_FLAG.POPS_VISUAL_PRESENCE_ENABLED] = false;
  flags[POPS_FEATURE_FLAG.POPS_AUDIO_FEATURES_ENABLED] = false;
  flags[POPS_FEATURE_FLAG.POPS_STRICT_FRAUD_MODE_ENABLED] = false;

  if (stage === "BETA" || stage === "PRODUCTION") {
    flags[POPS_FEATURE_FLAG.POPS_CREATOR_ANALYTICS_ENABLED] = true;
    flags[POPS_FEATURE_FLAG.POPS_BRAND_ANALYTICS_ENABLED] = true;
    flags[POPS_FEATURE_FLAG.POPS_ADMIN_REVIEW_ENABLED] = true;
  }

  if (stage === "PRODUCTION") {
    flags[POPS_FEATURE_FLAG.POPS_TRUST_IMPACT_ENABLED] = true;
    flags[POPS_FEATURE_FLAG.POPS_DISPUTES_ENABLED] = true;
    flags[POPS_FEATURE_FLAG.POPS_HIGH_VALUE_HOLDS_ENABLED] = true;
  }

  return flags;
}

export function getStageConfigDefaults(stage: PopsRolloutStage): Partial<PopsConfig> {
  if (stage === "MVP") {
    return {
      rewardDecisionEnabled: true,
      walletPendingEnabled: true,
      privacyReceiptRequired: true,
      visualPresenceAllowed: false,
      audioFeaturesAllowed: false,
      strictFraudMode: false
    };
  }

  if (stage === "BETA") {
    return {
      rewardDecisionEnabled: true,
      walletPendingEnabled: true,
      privacyReceiptRequired: true,
      visualPresenceAllowed: true,
      adminReviewEnabled: true,
      strictFraudMode: false
    };
  }

  return {
    rewardDecisionEnabled: true,
    walletPendingEnabled: true,
    trustImpactEnabled: true,
    disputeEnabled: true,
    privacyReceiptRequired: true,
    visualPresenceAllowed: true,
    strictFraudMode: false
  };
}

export function resolveDisabledBehavior(popsEnabled: boolean): PopsDisabledBehavior {
  if (popsEnabled) {
    return {
      campaignsCanRequirePops: true,
      rewardFlowMode: "pops_verification",
      shouldCreatePrivacyReceipt: true
    };
  }

  return {
    campaignsCanRequirePops: false,
    rewardFlowMode: "fallback_verification",
    shouldCreatePrivacyReceipt: false
  };
}

export function resolveRewardDecisionBehavior(
  rewardDecisionEnabled: boolean
): PopsRewardDecisionBehavior {
  return {
    captureAllowed: true,
    rewardApprovalAllowed: rewardDecisionEnabled
  };
}

export function resolvePrivacyReceiptReleaseGuard(input: {
  privacyReceiptRequired: boolean;
  privacyReceiptCreationFailed: boolean;
}): PopsReleaseGuardResult {
  if (input.privacyReceiptRequired && input.privacyReceiptCreationFailed) {
    return {
      shouldBlockRewardRelease: true,
      reason: "PRIVACY_RECEIPT_REQUIRED_AND_FAILED"
    };
  }

  return {
    shouldBlockRewardRelease: false,
    reason: "NONE"
  };
}

export function resolveProofPolicyWhenVisualDisabled(input: {
  visualPresenceEnabled: boolean;
  requiredProofLevel: PopsProofLevel;
  mode: "fail" | "downgrade";
}): PopsProofPolicyResult {
  if (input.visualPresenceEnabled) {
    return {
      allowed: true,
      effectiveProofLevel: input.requiredProofLevel,
      reason: "NONE"
    };
  }

  const visualRequiredAtOrAbove = proofOrder.LEVEL_4_IDENTITY_CONTINUITY;
  if (proofOrder[input.requiredProofLevel] < visualRequiredAtOrAbove) {
    return {
      allowed: true,
      effectiveProofLevel: input.requiredProofLevel,
      reason: "NONE"
    };
  }

  if (input.mode === "fail") {
    return {
      allowed: false,
      effectiveProofLevel: input.requiredProofLevel,
      reason: "VISUAL_REQUIRED_PROOF_FAILED"
    };
  }

  return {
    allowed: true,
    effectiveProofLevel: proofByOrder[visualRequiredAtOrAbove - 1],
    reason: "VISUAL_REQUIRED_PROOF_DOWNGRADED"
  };
}
