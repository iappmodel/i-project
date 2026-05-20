"use strict";
/**
 * Stage 31 — P.O.P.S rule & model versioning.
 * Bundles identify which scoring, fraud, reward, trust, wallet, campaign, and privacy
 * artifacts were active when a judgment was produced so replays and audits stay reproducible.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPS_RULE_TYPE = void 0;
exports.POPS_RULE_TYPE = {
    SCORING_MODEL: "SCORING_MODEL",
    FRAUD_MODEL: "FRAUD_MODEL",
    REWARD_FORMULA: "REWARD_FORMULA",
    PRIVACY_POLICY: "PRIVACY_POLICY",
    TRUST_RULES: "TRUST_RULES",
    WALLET_RELEASE_RULES: "WALLET_RELEASE_RULES",
    CAMPAIGN_REQUIREMENTS: "CAMPAIGN_REQUIREMENTS",
    RETENTION_POLICY: "RETENTION_POLICY",
    CONSENT_POLICY: "CONSENT_POLICY",
    RULE_BUNDLE: "RULE_BUNDLE"
};
