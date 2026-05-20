import type { AlphabetEvent } from "./event.types";

export type YieldGrantTier =
  | "none"
  | "micro"
  | "small"
  | "meaningful"
  | "major"
  | "life_changing";

export type YieldVerificationStatus =
  | "yield_accrued"
  | "grant_eligible"
  | "rare_grant_candidate"
  | "not_yet_eligible"
  | "cooling_down"
  | "needs_review"
  | "suspicious"
  | "disqualified";

export type YieldProfileStatus =
  | "created"
  | "accruing"
  | "grant_eligible"
  | "rare_candidate"
  | "cooling_down"
  | "needs_review"
  | "suspicious"
  | "disqualified";

export interface YieldProfile {
  yieldProfileId: string;
  userId: string;

  yieldScore: number;
  grantEligibilityScore: number;
  moralWeightScore: number;
  riskScore: number;

  grantTier: YieldGrantTier;
  status: YieldProfileStatus;

  lastGrantAt?: string | null;
  lastEvaluatedAt?: string | null;

  ageBand: string;

  createdAt: string;
  updatedAt: string;
}

export interface YieldSignalInput {
  yieldProfileId: string;
  userId: string;

  accountAgeDays: number;

  uValueScore: number;
  trustScore: number;

  verifiedContributionCount: number;
  verifiedContributionScore: number;

  learningScore: number;
  growthScore: number;
  masteryScore: number;
  helpScore: number;
  nobilityScore: number;
  safetyScore: number;
  creationScore: number;
  originalityScore: number;
  workScore: number;
  exchangeScore: number;
  reputationScore: number;
  identityStrengthScore: number;

  consistencyScore: number;
  longTermReliabilityScore: number;
  communityBenefitScore: number;

  recentPenaltyCount: number;
  recentSeverePenaltyCount: number;
  cooldownDaysRemaining: number;

  volatilityScore: number;
  gamingPatternScore: number;

  fraudRisk: number;
  grantGamingRisk: number;
  collusionRisk: number;
  fakeNobilityRisk: number;
  reputationFarmingRisk: number;
  identityRisk: number;
  deviceIntegrityScore: number;

  priorGrantCount: number;
  daysSinceLastGrant?: number | null;

  ageBand: string;

  metadata?: Record<string, unknown>;
}

export interface YieldRuleSet {
  minAccountAgeDays: number;

  minUValueScore: number;
  minTrustScore: number;
  minVerifiedContributionCount: number;

  minYieldScore: number;
  minGrantEligibilityScore: number;
  minMoralWeightScore: number;

  minRareGrantEligibilityScore: number;
  minRareMoralWeightScore: number;

  maxRiskScore: number;
  maxGrantGamingRisk: number;
  maxCollusionRisk: number;
  maxFakeNobilityRisk: number;
  maxReputationFarmingRisk: number;
  maxIdentityRisk: number;

  maxRecentPenaltyCount: number;
  maxRecentSeverePenaltyCount: number;

  minDaysBetweenGrants: number;

  under13Allowed: boolean;
  teenAllowed: boolean;
  guardianRequiredForMinorGrants: boolean;

  active: boolean;
}

export interface YieldVerificationResult {
  yieldProfileId: string;
  userId: string;

  status: YieldVerificationStatus;
  grantTier: YieldGrantTier;

  yieldScore: number;
  grantEligibilityScore: number;
  moralWeightScore: number;
  riskScore: number;

  reasons: string[];

  yieldAccruedEvent?: AlphabetEvent | null;
  grantEligibilityUpdatedEvent?: AlphabetEvent | null;
  rareGrantCandidateEvent?: AlphabetEvent | null;
  valueGrantAwardedEvent?: AlphabetEvent | null;
  grantGamingDetectedEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
