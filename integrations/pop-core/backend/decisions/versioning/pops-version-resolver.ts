import {
  POPS_CAMPAIGN_REQUIREMENTS_V1,
  POPS_PRIVACY_POLICY_V1,
  POPS_REWARD_FORMULA_V1,
  POPS_RULE_BUNDLE_V1,
  POPS_TRUST_RULES_V1,
  POPS_WALLET_RELEASE_RULES_V1
} from "./pops-rule-registry.js";
import { POPS_FRAUD_ENGINE_V1, POPS_SCORING_ENGINE_V1 } from "./pops-model-registry.js";
import type {
  PopsJudgmentVersionFields,
  PopsPrivacyReceiptVersionFields,
  PopsRewardDecisionVersionFields,
  PopsVersionBundle,
  PopsVersionResolverInput
} from "./pops-version.types.js";

function isoNow(): string {
  return new Date().toISOString();
}

function parseSemverMajor(appVersion: string): number {
  const m = /^v?(\d+)/.exec(appVersion.trim());
  return m ? Number.parseInt(m[1]!, 10) : 0;
}

/**
 * Resolves the active version bundle for a session.
 * Today this returns the v1 registry constants; hooks inspect `sessionAt`, `region`,
 * `campaignId`, `appVersion`, and `featureFlags` so future rows in `pops_rule_versions`
 * can override without API churn.
 */
export function resolvePopsVersionBundle(input: PopsVersionResolverInput): PopsVersionBundle {
  const createdAt = isoNow();
  const major = parseSemverMajor(input.appVersion);
  const euPrivacy =
    input.region === "EU" || input.region === "UK" || Boolean(input.featureFlags["pops_strict_privacy_eu"]);

  const campaignReq =
    input.campaignId && input.featureFlags["pops_campaign_requirements_beta"] === true
      ? `${POPS_CAMPAIGN_REQUIREMENTS_V1}_BETA`
      : POPS_CAMPAIGN_REQUIREMENTS_V1;

  const privacy = euPrivacy ? `${POPS_PRIVACY_POLICY_V1}_EU` : POPS_PRIVACY_POLICY_V1;

  void major;

  return {
    scoringModelVersion: POPS_SCORING_ENGINE_V1,
    fraudModelVersion: POPS_FRAUD_ENGINE_V1,
    rewardFormulaVersion: POPS_REWARD_FORMULA_V1,
    campaignRequirementVersion: campaignReq,
    privacyPolicyVersion: privacy,
    trustRuleVersion: POPS_TRUST_RULES_V1,
    walletRuleVersion: POPS_WALLET_RELEASE_RULES_V1,
    createdAt
  };
}

export function resolveJudgmentRuleVersion(_input: PopsVersionResolverInput): string {
  return POPS_RULE_BUNDLE_V1;
}

export function bundleToJudgmentVersionFields(
  bundle: PopsVersionBundle,
  ruleVersion: string
): PopsJudgmentVersionFields {
  return {
    scoringModelVersion: bundle.scoringModelVersion,
    fraudModelVersion: bundle.fraudModelVersion,
    rewardFormulaVersion: bundle.rewardFormulaVersion,
    ruleVersion,
    privacyPolicyVersion: bundle.privacyPolicyVersion,
    campaignRequirementVersion: bundle.campaignRequirementVersion
  };
}

export function bundleToRewardVersionFields(bundle: PopsVersionBundle): PopsRewardDecisionVersionFields {
  return {
    rewardFormulaVersion: bundle.rewardFormulaVersion,
    walletRuleVersion: bundle.walletRuleVersion,
    campaignRequirementVersion: bundle.campaignRequirementVersion
  };
}

export function bundleToPrivacyReceiptVersionFields(bundle: PopsVersionBundle): PopsPrivacyReceiptVersionFields {
  const eu = bundle.privacyPolicyVersion.includes("_EU");
  return {
    privacyPolicyVersion: bundle.privacyPolicyVersion,
    retentionPolicyVersion: eu ? "POPS_RETENTION_POLICY_V1_EU" : "POPS_RETENTION_POLICY_V1",
    consentPolicyVersion: eu ? "POPS_CONSENT_POLICY_V1_EU" : "POPS_CONSENT_POLICY_V1"
  };
}
