import { describe, expect, it } from "vitest";
import {
  POPS_CAMPAIGN_REQUIREMENTS_V1,
  POPS_PRIVACY_POLICY_V1,
  POPS_REWARD_FORMULA_V1,
  POPS_RULE_BUNDLE_V1
} from "../decisions/versioning/pops-rule-registry.js";
import { POPS_FRAUD_ENGINE_V1, POPS_SCORING_ENGINE_V1 } from "../decisions/versioning/pops-model-registry.js";
import {
  bundleToJudgmentVersionFields,
  bundleToPrivacyReceiptVersionFields,
  bundleToRewardVersionFields,
  resolveJudgmentRuleVersion,
  resolvePopsVersionBundle
} from "../decisions/versioning/pops-version-resolver.js";

describe("resolvePopsVersionBundle", () => {
  it("returns v1 registry ids for GLOBAL baseline", () => {
    const bundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "GLOBAL",
      appVersion: "2.4.1",
      featureFlags: {}
    });

    expect(bundle.scoringModelVersion).toBe(POPS_SCORING_ENGINE_V1);
    expect(bundle.fraudModelVersion).toBe(POPS_FRAUD_ENGINE_V1);
    expect(bundle.rewardFormulaVersion).toBe(POPS_REWARD_FORMULA_V1);
    expect(bundle.campaignRequirementVersion).toBe(POPS_CAMPAIGN_REQUIREMENTS_V1);
    expect(bundle.privacyPolicyVersion).toBe(POPS_PRIVACY_POLICY_V1);
    expect(bundle.walletRuleVersion).toBeTruthy();
    expect(bundle.createdAt).toMatch(/^\d{4}-/);
  });

  it("uses EU privacy suffix for EU region", () => {
    const bundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "EU",
      appVersion: "1.0.0",
      featureFlags: {}
    });

    expect(bundle.privacyPolicyVersion).toBe(`${POPS_PRIVACY_POLICY_V1}_EU`);
  });

  it("uses EU privacy when strict flag is on", () => {
    const bundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "US",
      appVersion: "1.0.0",
      featureFlags: { pops_strict_privacy_eu: true }
    });

    expect(bundle.privacyPolicyVersion).toBe(`${POPS_PRIVACY_POLICY_V1}_EU`);
  });

  it("uses campaign requirements beta when flag and campaignId set", () => {
    const bundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      campaignId: "camp_1",
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: { pops_campaign_requirements_beta: true }
    });

    expect(bundle.campaignRequirementVersion).toBe(`${POPS_CAMPAIGN_REQUIREMENTS_V1}_BETA`);
  });

  it("maps bundle to judgment, reward, and privacy field shapes", () => {
    const bundle = resolvePopsVersionBundle({
      sessionAt: new Date().toISOString(),
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: {}
    });
    const ruleVersion = resolveJudgmentRuleVersion({
      sessionAt: bundle.createdAt,
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: {}
    });

    expect(ruleVersion).toBe(POPS_RULE_BUNDLE_V1);

    const judgmentFields = bundleToJudgmentVersionFields(bundle, ruleVersion);
    expect(judgmentFields.ruleVersion).toBe(POPS_RULE_BUNDLE_V1);
    expect(judgmentFields.scoringModelVersion).toBe(bundle.scoringModelVersion);

    const rewardFields = bundleToRewardVersionFields(bundle);
    expect(rewardFields.rewardFormulaVersion).toBe(POPS_REWARD_FORMULA_V1);

    const privacyFields = bundleToPrivacyReceiptVersionFields(bundle);
    expect(privacyFields.privacyPolicyVersion).toBe(bundle.privacyPolicyVersion);
    expect(privacyFields.retentionPolicyVersion).toContain("POPS_RETENTION_POLICY_V1");
    expect(privacyFields.consentPolicyVersion).toContain("POPS_CONSENT_POLICY_V1");
  });
});
