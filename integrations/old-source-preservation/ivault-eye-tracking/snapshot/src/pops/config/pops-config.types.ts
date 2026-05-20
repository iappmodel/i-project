import type { PopsFeatureFlagState } from "./pops-feature-flags";

export type PopsEnvironment = "local" | "development" | "staging" | "production" | "test";

export type PopsRegion = "GLOBAL" | "US" | "EU" | "LATAM" | "APAC" | "MEA";

export type PopsPlatform = "ios" | "android" | "web" | "desktop";

export type PopsUserCohort =
  | "general"
  | "new_user"
  | "power_user"
  | "creator"
  | "brand"
  | "internal";

export type PopsAgeBand = "U13" | "13_17" | "18_24" | "25_34" | "35_44" | "45_54" | "55_PLUS";

export type PopsCampaignType =
  | "DIGITAL"
  | "LOCAL"
  | "BRAND_AWARENESS"
  | "PERFORMANCE"
  | "HIGH_VALUE"
  | "OPT_IN_VISUAL";

export type PopsProofLevel =
  | "LEVEL_1_SESSION"
  | "LEVEL_2_ATTENTION"
  | "LEVEL_3_INTENT"
  | "LEVEL_4_IDENTITY_CONTINUITY"
  | "LEVEL_5_HIGH_VALUE";

export type PopsTrustTier = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type PopsRiskTier = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PopsRolloutStage = "MVP" | "BETA" | "PRODUCTION";

export interface PopsConfig {
  enabled: boolean;
  checkpointIntervalMs: number;
  signalBatchIntervalMs: number;
  maxSessionDurationMs: number;
  lateEventWindowMs: number;
  offlineQueueMaxEvents: number;
  offlineQueueMaxAgeMs: number;
  defaultProofLevel: PopsProofLevel;
  visualPresenceAllowed: boolean;
  audioFeaturesAllowed: boolean;
  locationProofAllowed: boolean;
  rawStorageAllowed: boolean;
  privacyReceiptRequired: boolean;
  rewardDecisionEnabled: boolean;
  walletPendingEnabled: boolean;
  trustImpactEnabled: boolean;
  adminReviewEnabled: boolean;
  disputeEnabled: boolean;
  strictFraudMode: boolean;
  scoringModelVersion: string;
  ruleVersion: string;
}

export interface PopsRuntimeContext {
  environment: PopsEnvironment;
  region: PopsRegion;
  appVersion: string;
  platform: PopsPlatform;
  userCohort: PopsUserCohort;
  ageBand: PopsAgeBand;
  campaignType: PopsCampaignType;
  proofLevel: PopsProofLevel;
  trustTier: PopsTrustTier;
  riskTier: PopsRiskTier;
}

export interface PopsScopeSelector {
  environment?: PopsEnvironment | PopsEnvironment[];
  region?: PopsRegion | PopsRegion[];
  appVersion?: string | string[];
  platform?: PopsPlatform | PopsPlatform[];
  userCohort?: PopsUserCohort | PopsUserCohort[];
  ageBand?: PopsAgeBand | PopsAgeBand[];
  campaignType?: PopsCampaignType | PopsCampaignType[];
  proofLevel?: PopsProofLevel | PopsProofLevel[];
  trustTier?: PopsTrustTier | PopsTrustTier[];
  riskTier?: PopsRiskTier | PopsRiskTier[];
}

export interface PopsScopedOverride extends PopsScopeSelector {
  id: string;
  priority?: number;
  config?: Partial<PopsConfig>;
  featureFlags?: Partial<PopsFeatureFlagState>;
}

export interface PopsDisabledBehavior {
  campaignsCanRequirePops: boolean;
  rewardFlowMode: "pops_verification" | "fallback_verification";
  shouldCreatePrivacyReceipt: boolean;
}

export interface PopsRewardDecisionBehavior {
  captureAllowed: boolean;
  rewardApprovalAllowed: boolean;
}

export interface PopsReleaseGuardResult {
  shouldBlockRewardRelease: boolean;
  reason: "NONE" | "PRIVACY_RECEIPT_REQUIRED_AND_FAILED";
}

export interface PopsProofPolicyResult {
  allowed: boolean;
  effectiveProofLevel: PopsProofLevel;
  reason:
    | "NONE"
    | "VISUAL_REQUIRED_PROOF_FAILED"
    | "VISUAL_REQUIRED_PROOF_DOWNGRADED";
}

export interface PopsResolvedConfig {
  rolloutStage: PopsRolloutStage;
  context: PopsRuntimeContext;
  config: PopsConfig;
  featureFlags: PopsFeatureFlagState;
}
