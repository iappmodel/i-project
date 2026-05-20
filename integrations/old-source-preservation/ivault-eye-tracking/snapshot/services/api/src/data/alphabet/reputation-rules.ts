import type { ReputationRuleSet } from "../../types/alphabet/reputation.types";

export const REPUTATION_RULES: ReputationRuleSet = {
  minAccountAgeDays: 7,
  minTrustScore: 20,
  minUValueScore: 5,
  minIdentityStrengthScore: 0.55,
  minReputationScore: 0.55,
  minCredibilityScore: 0.6,
  minVerifiedEventCount: 5,
  maxRiskScore: 0.4,
  maxImpersonationRisk: 0.25,
  maxSyntheticIdentityRisk: 0.25,
  maxReputationFarmingRisk: 0.35,
  maxBanEvasionRisk: 0.2,
  under13Allowed: true,
  teenAllowed: true,
  requiresGuardianForUnder13: true,
  active: true
};
