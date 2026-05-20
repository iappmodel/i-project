"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPS_REGISTERED_RULES = exports.POPS_RULE_BUNDLE_V1 = exports.POPS_CONSENT_POLICY_V1 = exports.POPS_RETENTION_POLICY_V1 = exports.POPS_CAMPAIGN_REQUIREMENTS_V1 = exports.POPS_WALLET_RELEASE_RULES_V1 = exports.POPS_TRUST_RULES_V1 = exports.POPS_PRIVACY_POLICY_V1 = exports.POPS_REWARD_FORMULA_V1 = exports.POPS_FRAUD_MODEL_V1 = exports.POPS_SCORING_MODEL_V1 = void 0;
exports.popsRuleById = popsRuleById;
const pops_version_types_1 = require("./pops-version.types");
exports.POPS_SCORING_MODEL_V1 = "POPS_SCORING_MODEL_V1";
exports.POPS_FRAUD_MODEL_V1 = "POPS_FRAUD_MODEL_V1";
exports.POPS_REWARD_FORMULA_V1 = "POPS_REWARD_FORMULA_V1";
exports.POPS_PRIVACY_POLICY_V1 = "POPS_PRIVACY_POLICY_V1";
exports.POPS_TRUST_RULES_V1 = "POPS_TRUST_RULES_V1";
exports.POPS_WALLET_RELEASE_RULES_V1 = "POPS_WALLET_RELEASE_RULES_V1";
exports.POPS_CAMPAIGN_REQUIREMENTS_V1 = "POPS_CAMPAIGN_REQUIREMENTS_V1";
exports.POPS_RETENTION_POLICY_V1 = "POPS_RETENTION_POLICY_V1";
exports.POPS_CONSENT_POLICY_V1 = "POPS_CONSENT_POLICY_V1";
/** Aggregate ruleset pointer stored as `ruleVersion` on judgments when no finer bundle id exists. */
exports.POPS_RULE_BUNDLE_V1 = "POPS_RULE_BUNDLE_V1";
exports.POPS_REGISTERED_RULES = [
    { id: exports.POPS_SCORING_MODEL_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.SCORING_MODEL, description: "Default weighted presence/attention/intent scoring" },
    { id: exports.POPS_FRAUD_MODEL_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.FRAUD_MODEL, description: "Heuristic fraud risk from signal batches" },
    { id: exports.POPS_REWARD_FORMULA_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.REWARD_FORMULA, description: "Reward quality and amount composition v1" },
    { id: exports.POPS_PRIVACY_POLICY_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.PRIVACY_POLICY, description: "Privacy receipt and minimization policy v1" },
    { id: exports.POPS_TRUST_RULES_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.TRUST_RULES, description: "Trust impact mapping for P.O.P.S outcomes v1" },
    { id: exports.POPS_WALLET_RELEASE_RULES_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.WALLET_RELEASE_RULES, description: "Wallet pending / hold / release gates v1" },
    { id: exports.POPS_CAMPAIGN_REQUIREMENTS_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.CAMPAIGN_REQUIREMENTS, description: "Campaign eligibility and completion requirements v1" },
    { id: exports.POPS_RETENTION_POLICY_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.RETENTION_POLICY, description: "Feature retention TTL policy v1" },
    { id: exports.POPS_CONSENT_POLICY_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.CONSENT_POLICY, description: "Consent scopes for stored features v1" },
    { id: exports.POPS_RULE_BUNDLE_V1, ruleType: pops_version_types_1.POPS_RULE_TYPE.RULE_BUNDLE, description: "Aggregate pointer for judgment.ruleVersion" }
];
function popsRuleById(id) {
    return exports.POPS_REGISTERED_RULES.find((r) => r.id === id);
}
