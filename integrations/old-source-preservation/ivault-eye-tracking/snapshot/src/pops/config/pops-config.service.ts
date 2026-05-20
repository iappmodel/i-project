import type {
  PopsConfig,
  PopsEnvironment,
  PopsResolvedConfig,
  PopsRolloutStage,
  PopsRuntimeContext,
  PopsScopedOverride
} from "./pops-config.types";
import type { PopsFeatureFlagState } from "./pops-feature-flags";
import {
  POPS_FEATURE_FLAG,
  createDefaultFeatureFlags
} from "./pops-feature-flags";
import { getRegionPolicy } from "./pops-region-policy";
import { getStageConfigDefaults, getStageFeatureFlags } from "./pops-rollout-rules";

const BASE_CONFIG: PopsConfig = {
  enabled: true,
  checkpointIntervalMs: 5_000,
  signalBatchIntervalMs: 3_000,
  maxSessionDurationMs: 30 * 60_000,
  lateEventWindowMs: 60_000,
  offlineQueueMaxEvents: 1_000,
  offlineQueueMaxAgeMs: 24 * 60 * 60_000,
  defaultProofLevel: "LEVEL_2_ATTENTION",
  visualPresenceAllowed: false,
  audioFeaturesAllowed: false,
  locationProofAllowed: false,
  rawStorageAllowed: false,
  privacyReceiptRequired: true,
  rewardDecisionEnabled: true,
  walletPendingEnabled: true,
  trustImpactEnabled: false,
  adminReviewEnabled: false,
  disputeEnabled: false,
  strictFraudMode: false,
  scoringModelVersion: "pops-score-v1",
  ruleVersion: "pops-rules-v22"
};

const ENVIRONMENT_DEFAULTS: Record<PopsEnvironment, Partial<PopsConfig>> = {
  local: {
    checkpointIntervalMs: 2_000,
    signalBatchIntervalMs: 2_000,
    lateEventWindowMs: 120_000
  },
  development: {
    checkpointIntervalMs: 2_500,
    signalBatchIntervalMs: 2_500
  },
  test: {
    checkpointIntervalMs: 500,
    signalBatchIntervalMs: 500,
    maxSessionDurationMs: 5 * 60_000
  },
  staging: {
    checkpointIntervalMs: 5_000,
    signalBatchIntervalMs: 3_000
  },
  production: {
    checkpointIntervalMs: 5_000,
    signalBatchIntervalMs: 3_000
  }
};

export class PopsConfigService {
  private readonly rolloutStage: PopsRolloutStage;

  private readonly scopedOverrides: PopsScopedOverride[] = [];

  constructor(rolloutStage: PopsRolloutStage) {
    this.rolloutStage = rolloutStage;
    this.registerBuiltInOverrides();
  }

  public registerScopedOverride(override: PopsScopedOverride): void {
    this.scopedOverrides.push(override);
  }

  public resolve(context: PopsRuntimeContext): PopsResolvedConfig {
    let config: PopsConfig = {
      ...BASE_CONFIG,
      ...ENVIRONMENT_DEFAULTS[context.environment],
      ...getStageConfigDefaults(this.rolloutStage),
      ...getRegionPolicy(context.region).config
    };

    let featureFlags: PopsFeatureFlagState = {
      ...createDefaultFeatureFlags(false),
      ...getStageFeatureFlags(this.rolloutStage)
    };

    const applicableOverrides = this.scopedOverrides
      .filter((override) => this.matchesContext(override, context))
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const override of applicableOverrides) {
      if (override.config != null) {
        config = {
          ...config,
          ...override.config
        };
      }
      if (override.featureFlags != null) {
        featureFlags = {
          ...featureFlags,
          ...override.featureFlags
        };
      }
    }

    // Keep struct config and feature flags synchronized for critical flow gates.
    config.enabled = featureFlags[POPS_FEATURE_FLAG.POPS_ENABLED] && config.enabled;
    config.rewardDecisionEnabled =
      featureFlags[POPS_FEATURE_FLAG.POPS_REWARD_DECISIONS_ENABLED] &&
      config.rewardDecisionEnabled;
    config.walletPendingEnabled =
      featureFlags[POPS_FEATURE_FLAG.POPS_WALLET_PENDING_ENABLED] && config.walletPendingEnabled;
    config.trustImpactEnabled =
      featureFlags[POPS_FEATURE_FLAG.POPS_TRUST_IMPACT_ENABLED] && config.trustImpactEnabled;
    config.adminReviewEnabled =
      featureFlags[POPS_FEATURE_FLAG.POPS_ADMIN_REVIEW_ENABLED] && config.adminReviewEnabled;
    config.disputeEnabled = featureFlags[POPS_FEATURE_FLAG.POPS_DISPUTES_ENABLED] && config.disputeEnabled;
    config.strictFraudMode =
      featureFlags[POPS_FEATURE_FLAG.POPS_STRICT_FRAUD_MODE_ENABLED] && config.strictFraudMode;
    config.visualPresenceAllowed =
      featureFlags[POPS_FEATURE_FLAG.POPS_VISUAL_PRESENCE_ENABLED] && config.visualPresenceAllowed;
    config.audioFeaturesAllowed =
      featureFlags[POPS_FEATURE_FLAG.POPS_AUDIO_FEATURES_ENABLED] && config.audioFeaturesAllowed;
    config.locationProofAllowed =
      featureFlags[POPS_FEATURE_FLAG.POPS_LOCATION_PROOF_ENABLED] && config.locationProofAllowed;
    config.privacyReceiptRequired =
      featureFlags[POPS_FEATURE_FLAG.POPS_PRIVACY_RECEIPTS_ENABLED] && config.privacyReceiptRequired;

    return {
      rolloutStage: this.rolloutStage,
      context,
      config,
      featureFlags
    };
  }

  private matchesContext(override: PopsScopedOverride, context: PopsRuntimeContext): boolean {
    return (
      this.matchesValue(override.environment, context.environment) &&
      this.matchesValue(override.region, context.region) &&
      this.matchesValue(override.appVersion, context.appVersion) &&
      this.matchesValue(override.platform, context.platform) &&
      this.matchesValue(override.userCohort, context.userCohort) &&
      this.matchesValue(override.ageBand, context.ageBand) &&
      this.matchesValue(override.campaignType, context.campaignType) &&
      this.matchesValue(override.proofLevel, context.proofLevel) &&
      this.matchesValue(override.trustTier, context.trustTier) &&
      this.matchesValue(override.riskTier, context.riskTier)
    );
  }

  private matchesValue<T extends string>(selector: T | T[] | undefined, actual: T): boolean {
    if (selector == null) return true;
    if (Array.isArray(selector)) return selector.includes(actual);
    return selector === actual;
  }

  private registerBuiltInOverrides(): void {
    this.scopedOverrides.push({
      id: "builtin-strict-fraud-high-risk",
      priority: 10,
      riskTier: ["HIGH", "CRITICAL"],
      config: {
        strictFraudMode: true
      },
      featureFlags: {
        POPS_STRICT_FRAUD_MODE_ENABLED: true
      }
    });

    this.scopedOverrides.push({
      id: "builtin-strict-fraud-high-value-campaign",
      priority: 11,
      campaignType: "HIGH_VALUE",
      config: {
        strictFraudMode: true
      },
      featureFlags: {
        POPS_STRICT_FRAUD_MODE_ENABLED: true,
        POPS_HIGH_VALUE_HOLDS_ENABLED: true
      }
    });

    if (this.rolloutStage === "BETA" || this.rolloutStage === "PRODUCTION") {
      this.scopedOverrides.push({
        id: "builtin-beta-visual-opt-in",
        priority: 12,
        campaignType: "OPT_IN_VISUAL",
        config: {
          visualPresenceAllowed: true
        },
        featureFlags: {
          POPS_VISUAL_PRESENCE_ENABLED: true
        }
      });
    }
  }
}
