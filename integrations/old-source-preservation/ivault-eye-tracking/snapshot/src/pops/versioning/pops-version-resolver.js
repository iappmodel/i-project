"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePopsVersionBundle = resolvePopsVersionBundle;
exports.resolveJudgmentRuleVersion = resolveJudgmentRuleVersion;
exports.bundleToJudgmentVersionFields = bundleToJudgmentVersionFields;
exports.bundleToRewardVersionFields = bundleToRewardVersionFields;
exports.bundleToPrivacyReceiptVersionFields = bundleToPrivacyReceiptVersionFields;
const pops_rule_registry_1 = require("./pops-rule-registry");
const pops_model_registry_1 = require("./pops-model-registry");
function isoNow() {
    return new Date().toISOString();
}
function parseSemverMajor(appVersion) {
    const m = /^v?(\d+)/.exec(appVersion.trim());
    return m ? Number.parseInt(m[1], 10) : 0;
}
/**
 * Resolves the active version bundle for a session.
 * Today this returns the v1 registry constants; hooks inspect `sessionAt`, `region`,
 * `campaignId`, `appVersion`, and `featureFlags` so future rows in `pops_rule_versions`
 * can override without API churn.
 */
function resolvePopsVersionBundle(input) {
    const createdAt = isoNow();
    const major = parseSemverMajor(input.appVersion);
    const euPrivacy = input.region === "EU" || input.region === "UK" || Boolean(input.featureFlags["pops_strict_privacy_eu"]);
    // Placeholder for future DB-backed resolution: campaign-specific requirement tracks.
    const campaignReq = input.campaignId && input.featureFlags["pops_campaign_requirements_beta"] === true
        ? `${pops_rule_registry_1.POPS_CAMPAIGN_REQUIREMENTS_V1}_BETA`
        : pops_rule_registry_1.POPS_CAMPAIGN_REQUIREMENTS_V1;
    const privacy = euPrivacy ? `${pops_rule_registry_1.POPS_PRIVACY_POLICY_V1}_EU` : pops_rule_registry_1.POPS_PRIVACY_POLICY_V1;
    void major; // reserved for future "legacy app" bundles
    return {
        scoringModelVersion: pops_model_registry_1.POPS_SCORING_ENGINE_V1,
        fraudModelVersion: pops_model_registry_1.POPS_FRAUD_ENGINE_V1,
        rewardFormulaVersion: pops_rule_registry_1.POPS_REWARD_FORMULA_V1,
        campaignRequirementVersion: campaignReq,
        privacyPolicyVersion: privacy,
        trustRuleVersion: pops_rule_registry_1.POPS_TRUST_RULES_V1,
        walletRuleVersion: pops_rule_registry_1.POPS_WALLET_RELEASE_RULES_V1,
        createdAt
    };
}
function resolveJudgmentRuleVersion(_input) {
    return pops_rule_registry_1.POPS_RULE_BUNDLE_V1;
}
function bundleToJudgmentVersionFields(bundle, ruleVersion) {
    return {
        scoringModelVersion: bundle.scoringModelVersion,
        fraudModelVersion: bundle.fraudModelVersion,
        rewardFormulaVersion: bundle.rewardFormulaVersion,
        ruleVersion,
        privacyPolicyVersion: bundle.privacyPolicyVersion,
        campaignRequirementVersion: bundle.campaignRequirementVersion
    };
}
function bundleToRewardVersionFields(bundle) {
    return {
        rewardFormulaVersion: bundle.rewardFormulaVersion,
        walletRuleVersion: bundle.walletRuleVersion,
        campaignRequirementVersion: bundle.campaignRequirementVersion
    };
}
function bundleToPrivacyReceiptVersionFields(bundle) {
    const eu = bundle.privacyPolicyVersion.includes("_EU");
    return {
        privacyPolicyVersion: bundle.privacyPolicyVersion,
        retentionPolicyVersion: eu ? `${pops_rule_registry_1.POPS_RETENTION_POLICY_V1}_EU` : pops_rule_registry_1.POPS_RETENTION_POLICY_V1,
        consentPolicyVersion: eu ? `${pops_rule_registry_1.POPS_CONSENT_POLICY_V1}_EU` : pops_rule_registry_1.POPS_CONSENT_POLICY_V1
    };
}
