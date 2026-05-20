import type { YieldRuleSet } from "../../types/alphabet/yield.types";

export const YIELD_RULES: YieldRuleSet = {
  minAccountAgeDays: 30,

  minUValueScore: 25,
  minTrustScore: 55,
  minVerifiedContributionCount: 20,

  minYieldScore: 0.55,
  minGrantEligibilityScore: 0.65,
  minMoralWeightScore: 0.6,

  minRareGrantEligibilityScore: 0.82,
  minRareMoralWeightScore: 0.78,

  maxRiskScore: 0.3,
  maxGrantGamingRisk: 0.2,
  maxCollusionRisk: 0.22,
  maxFakeNobilityRisk: 0.18,
  maxReputationFarmingRisk: 0.25,
  maxIdentityRisk: 0.2,

  maxRecentPenaltyCount: 2,
  maxRecentSeverePenaltyCount: 0,

  minDaysBetweenGrants: 90,

  under13Allowed: true,
  teenAllowed: true,
  guardianRequiredForMinorGrants: true,

  active: true
};
