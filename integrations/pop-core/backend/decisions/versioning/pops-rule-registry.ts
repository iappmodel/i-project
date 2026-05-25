import { POPS_RULE_TYPE, type PopsRuleType } from "./pops-version.types.js";

export const POPS_SCORING_MODEL_V1 = "POPS_SCORING_MODEL_V1";
export const POPS_FRAUD_MODEL_V1 = "POPS_FRAUD_MODEL_V1";
export const POPS_REWARD_FORMULA_V1 = "POPS_REWARD_FORMULA_V1";
export const POPS_PRIVACY_POLICY_V1 = "POPS_PRIVACY_POLICY_V1";
export const POPS_TRUST_RULES_V1 = "POPS_TRUST_RULES_V1";
export const POPS_WALLET_RELEASE_RULES_V1 = "POPS_WALLET_RELEASE_RULES_V1";
export const POPS_CAMPAIGN_REQUIREMENTS_V1 = "POPS_CAMPAIGN_REQUIREMENTS_V1";
export const POPS_RETENTION_POLICY_V1 = "POPS_RETENTION_POLICY_V1";
export const POPS_CONSENT_POLICY_V1 = "POPS_CONSENT_POLICY_V1";

/** Aggregate ruleset pointer stored as `ruleVersion` on judgments when no finer bundle id exists. */
export const POPS_RULE_BUNDLE_V1 = "POPS_RULE_BUNDLE_V1";

export interface PopsRegisteredRule {
  id: string;
  ruleType: PopsRuleType;
  description: string;
}

export const POPS_REGISTERED_RULES: readonly PopsRegisteredRule[] = [
  { id: POPS_SCORING_MODEL_V1, ruleType: POPS_RULE_TYPE.SCORING_MODEL, description: "Default weighted presence/attention/intent scoring" },
  { id: POPS_FRAUD_MODEL_V1, ruleType: POPS_RULE_TYPE.FRAUD_MODEL, description: "Heuristic fraud risk from signal batches" },
  { id: POPS_REWARD_FORMULA_V1, ruleType: POPS_RULE_TYPE.REWARD_FORMULA, description: "Reward quality and amount composition v1" },
  { id: POPS_PRIVACY_POLICY_V1, ruleType: POPS_RULE_TYPE.PRIVACY_POLICY, description: "Privacy receipt and minimization policy v1" },
  { id: POPS_TRUST_RULES_V1, ruleType: POPS_RULE_TYPE.TRUST_RULES, description: "Trust impact mapping for P.O.P.S outcomes v1" },
  { id: POPS_WALLET_RELEASE_RULES_V1, ruleType: POPS_RULE_TYPE.WALLET_RELEASE_RULES, description: "Wallet pending / hold / release gates v1" },
  { id: POPS_CAMPAIGN_REQUIREMENTS_V1, ruleType: POPS_RULE_TYPE.CAMPAIGN_REQUIREMENTS, description: "Campaign eligibility and completion requirements v1" },
  { id: POPS_RETENTION_POLICY_V1, ruleType: POPS_RULE_TYPE.RETENTION_POLICY, description: "Feature retention TTL policy v1" },
  { id: POPS_CONSENT_POLICY_V1, ruleType: POPS_RULE_TYPE.CONSENT_POLICY, description: "Consent scopes for stored features v1" },
  { id: POPS_RULE_BUNDLE_V1, ruleType: POPS_RULE_TYPE.RULE_BUNDLE, description: "Aggregate pointer for judgment.ruleVersion" }
] as const;

export function popsRuleById(id: string): PopsRegisteredRule | undefined {
  return POPS_REGISTERED_RULES.find((r) => r.id === id);
}
