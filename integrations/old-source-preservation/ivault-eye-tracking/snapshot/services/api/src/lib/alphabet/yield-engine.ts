import { YIELD_RULES } from "../../data/alphabet/yield-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  YieldGrantTier,
  YieldSignalInput,
  YieldVerificationResult,
  YieldVerificationStatus
} from "../../types/alphabet/yield.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function normalizedTrust(input: YieldSignalInput): number {
  return clamp(input.trustScore / 100);
}

function normalizedUValue(input: YieldSignalInput): number {
  return clamp(input.uValueScore / 100);
}

function calculateMoralWeightScore(input: YieldSignalInput): number {
  const score =
    clamp(input.helpScore) * 0.18 +
    clamp(input.nobilityScore) * 0.22 +
    clamp(input.safetyScore) * 0.16 +
    clamp(input.communityBenefitScore) * 0.18 +
    clamp(input.learningScore) * 0.08 +
    clamp(input.growthScore) * 0.08 +
    clamp(input.masteryScore) * 0.05 +
    clamp(input.creationScore) * 0.05;

  return clamp(score);
}

function calculateYieldScore(input: YieldSignalInput): number {
  const accountAgeScore = clamp(input.accountAgeDays / 730);
  const contributionCountScore = clamp(input.verifiedContributionCount / 500);

  const broadValueScore =
    clamp(input.verifiedContributionScore) * 0.12 +
    clamp(input.learningScore) * 0.07 +
    clamp(input.growthScore) * 0.08 +
    clamp(input.masteryScore) * 0.08 +
    clamp(input.helpScore) * 0.1 +
    clamp(input.nobilityScore) * 0.11 +
    clamp(input.safetyScore) * 0.09 +
    clamp(input.creationScore) * 0.08 +
    clamp(input.originalityScore) * 0.06 +
    clamp(input.workScore) * 0.06 +
    clamp(input.exchangeScore) * 0.05 +
    clamp(input.reputationScore) * 0.05 +
    clamp(input.communityBenefitScore) * 0.05;

  const stabilityScore =
    clamp(input.consistencyScore) * 0.4 +
    clamp(input.longTermReliabilityScore) * 0.4 +
    accountAgeScore * 0.2;

  const trustValueSpine =
    normalizedUValue(input) * 0.35 +
    normalizedTrust(input) * 0.35 +
    contributionCountScore * 0.15 +
    stabilityScore * 0.15;

  const penalty =
    clamp(input.volatilityScore) * 0.08 +
    clamp(input.gamingPatternScore) * 0.1 +
    clamp(input.recentPenaltyCount / 10) * 0.1 +
    clamp(input.recentSeverePenaltyCount / 3) * 0.2;

  return clamp(broadValueScore * 0.45 + trustValueSpine * 0.45 + stabilityScore * 0.1 - penalty);
}

function calculateRiskScore(input: YieldSignalInput): number {
  let risk =
    clamp(input.fraudRisk) * 0.18 +
    clamp(input.grantGamingRisk) * 0.22 +
    clamp(input.collusionRisk) * 0.14 +
    clamp(input.fakeNobilityRisk) * 0.18 +
    clamp(input.reputationFarmingRisk) * 0.12 +
    clamp(input.identityRisk) * 0.1 +
    clamp(input.gamingPatternScore) * 0.04 +
    (input.deviceIntegrityScore < 0.5 ? 0.02 : 0);

  if (input.recentSeverePenaltyCount > 0) {
    risk += 0.15;
  }

  if (input.priorGrantCount > 0 && input.daysSinceLastGrant !== null && input.daysSinceLastGrant !== undefined) {
    if (input.daysSinceLastGrant < YIELD_RULES.minDaysBetweenGrants) {
      risk += 0.08;
    }
  }

  return clamp(risk);
}

function calculateGrantEligibilityScore(input: YieldSignalInput): number {
  const yieldScore = calculateYieldScore(input);
  const moralWeightScore = calculateMoralWeightScore(input);
  const riskScore = calculateRiskScore(input);

  const contributionDepth =
    clamp(input.verifiedContributionScore) * 0.35 +
    clamp(input.verifiedContributionCount / 500) * 0.25 +
    clamp(input.consistencyScore) * 0.2 +
    clamp(input.longTermReliabilityScore) * 0.2;

  const identityTrustGate =
    clamp(input.identityStrengthScore) * 0.25 +
    normalizedTrust(input) * 0.35 +
    normalizedUValue(input) * 0.25 +
    clamp(input.reputationScore) * 0.15;

  const score =
    yieldScore * 0.35 +
    moralWeightScore * 0.25 +
    contributionDepth * 0.2 +
    identityTrustGate * 0.2;

  return clamp(score * (1 - riskScore * 0.65));
}

function determineGrantTier(params: {
  status: YieldVerificationStatus;
  grantEligibilityScore: number;
  moralWeightScore: number;
  riskScore: number;
  input: YieldSignalInput;
}): YieldGrantTier {
  const { status, grantEligibilityScore, moralWeightScore, riskScore, input } = params;

  if (
    status === "disqualified" ||
    status === "suspicious" ||
    status === "needs_review" ||
    status === "cooling_down" ||
    status === "not_yet_eligible"
  ) {
    return "none";
  }

  if (riskScore > 0.25) return "none";

  const combined = grantEligibilityScore * 0.65 + moralWeightScore * 0.35;

  if (
    status === "rare_grant_candidate" &&
    combined >= 0.92 &&
    input.priorGrantCount === 0 &&
    input.trustScore >= 85 &&
    input.uValueScore >= 75
  ) {
    return "life_changing";
  }

  if (status === "rare_grant_candidate" && combined >= 0.86) return "major";
  if (status === "grant_eligible" && combined >= 0.78) return "meaningful";
  if (status === "grant_eligible" && combined >= 0.7) return "small";
  if (status === "yield_accrued") return "micro";

  return "none";
}

function decideYieldStatus(params: {
  input: YieldSignalInput;
  yieldScore: number;
  grantEligibilityScore: number;
  moralWeightScore: number;
  riskScore: number;
  reasons: string[];
}): YieldVerificationStatus {
  const { input, yieldScore, grantEligibilityScore, moralWeightScore, riskScore, reasons } =
    params;

  const rule = YIELD_RULES;

  if (!rule.active) {
    reasons.push("yield_rules_inactive");
    return "needs_review";
  }

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_yield");
    return "needs_review";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_yield");
    return "needs_review";
  }

  if (
    (isUnder13(input.ageBand) || isTeen(input.ageBand)) &&
    rule.guardianRequiredForMinorGrants &&
    !input.metadata?.guardianApproved
  ) {
    reasons.push("minor_grant_requires_guardian_approval");
    return "needs_review";
  }

  if (input.recentSeverePenaltyCount > rule.maxRecentSeverePenaltyCount) {
    reasons.push("recent_severe_penalty_blocks_yield");
    return "disqualified";
  }

  if (input.recentPenaltyCount > rule.maxRecentPenaltyCount) {
    reasons.push("recent_penalty_count_above_maximum");
    return "cooling_down";
  }

  if (input.cooldownDaysRemaining > 0) {
    reasons.push("yield_cooling_down");
    return "cooling_down";
  }

  if (
    input.priorGrantCount > 0 &&
    input.daysSinceLastGrant !== null &&
    input.daysSinceLastGrant !== undefined &&
    input.daysSinceLastGrant < rule.minDaysBetweenGrants
  ) {
    reasons.push("minimum_days_between_grants_not_met");
    return "cooling_down";
  }

  if (input.grantGamingRisk > rule.maxGrantGamingRisk) {
    reasons.push("grant_gaming_risk_above_maximum");
    return "suspicious";
  }

  if (input.collusionRisk > rule.maxCollusionRisk) {
    reasons.push("collusion_risk_above_maximum");
    return "suspicious";
  }

  if (input.fakeNobilityRisk > rule.maxFakeNobilityRisk) {
    reasons.push("fake_nobility_risk_above_maximum");
    return "suspicious";
  }

  if (input.reputationFarmingRisk > rule.maxReputationFarmingRisk) {
    reasons.push("reputation_farming_risk_above_maximum");
    return "suspicious";
  }

  if (input.identityRisk > rule.maxIdentityRisk) {
    reasons.push("identity_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.7 ? "disqualified" : "suspicious";
  }

  if (input.accountAgeDays < rule.minAccountAgeDays) {
    reasons.push("account_age_below_minimum");
    return "not_yet_eligible";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_minimum");
    return "not_yet_eligible";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_minimum");
    return "not_yet_eligible";
  }

  if (input.verifiedContributionCount < rule.minVerifiedContributionCount) {
    reasons.push("verified_contribution_count_below_minimum");
    return "not_yet_eligible";
  }

  if (yieldScore < rule.minYieldScore) {
    reasons.push("yield_score_below_minimum");
    return "not_yet_eligible";
  }

  if (
    grantEligibilityScore >= rule.minRareGrantEligibilityScore &&
    moralWeightScore >= rule.minRareMoralWeightScore &&
    input.trustScore >= 75 &&
    input.uValueScore >= 60 &&
    input.consistencyScore >= 0.75
  ) {
    reasons.push("rare_grant_candidate_selected");
    return "rare_grant_candidate";
  }

  if (
    grantEligibilityScore >= rule.minGrantEligibilityScore &&
    moralWeightScore >= rule.minMoralWeightScore
  ) {
    reasons.push("grant_eligible");
    return "grant_eligible";
  }

  reasons.push("yield_accrued");
  return "yield_accrued";
}

function createYieldAlphabetEvent(params: {
  input: YieldSignalInput;
  eventType: AlphabetEvent["eventType"];
  coinCode: AlphabetEvent["coinCode"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "yield_profile",
    objectId: params.input.yieldProfileId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      yieldProfileId: params.input.yieldProfileId,
      accountAgeDays: params.input.accountAgeDays,
      uValueScore: params.input.uValueScore,
      trustScore: params.input.trustScore,
      verifiedContributionCount: params.input.verifiedContributionCount,
      priorGrantCount: params.input.priorGrantCount,
      daysSinceLastGrant: params.input.daysSinceLastGrant ?? null,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyYieldProfile(input: YieldSignalInput): YieldVerificationResult {
  const reasons: string[] = [];

  const yieldScore = calculateYieldScore(input);
  const grantEligibilityScore = calculateGrantEligibilityScore(input);
  const moralWeightScore = calculateMoralWeightScore(input);
  const riskScore = calculateRiskScore(input);

  const status = decideYieldStatus({
    input,
    yieldScore,
    grantEligibilityScore,
    moralWeightScore,
    riskScore,
    reasons
  });

  const grantTier = determineGrantTier({
    status,
    grantEligibilityScore,
    moralWeightScore,
    riskScore,
    input
  });

  const safeOrPositive =
    status === "yield_accrued" ||
    status === "grant_eligible" ||
    status === "rare_grant_candidate";

  const yieldAccruedEvent =
    safeOrPositive
      ? createYieldAlphabetEvent({
          input,
          eventType: "yield_accrued",
          coinCode: "Y",
          rawScore: yieldScore,
          qualityScore: grantEligibilityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "score_update",
            status,
            grantTier,
            yieldScore,
            grantEligibilityScore,
            moralWeightScore,
            reasons
          }
        })
      : null;

  const grantEligibilityUpdatedEvent =
    status === "grant_eligible" || status === "rare_grant_candidate"
      ? createYieldAlphabetEvent({
          input,
          eventType: "grant_eligibility_updated",
          coinCode: "Y",
          rawScore: grantEligibilityScore,
          qualityScore: moralWeightScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "identity_update",
            status,
            grantTier,
            yieldScore,
            grantEligibilityScore,
            moralWeightScore,
            reasons
          }
        })
      : null;

  const rareGrantCandidateEvent =
    status === "rare_grant_candidate"
      ? createYieldAlphabetEvent({
          input,
          eventType: "rare_grant_candidate_selected",
          coinCode: "Y",
          rawScore: grantEligibilityScore,
          qualityScore: moralWeightScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "identity_update",
            status,
            grantTier,
            yieldScore,
            grantEligibilityScore,
            moralWeightScore,
            reviewRequired: true,
            reasons
          }
        })
      : null;

  /**
   * Production rule:
   * value_grant_awarded must be created only after review/approval.
   * This engine only emits it when explicitly passed metadata.grantApproved === true.
   */
  const valueGrantAwardedEvent =
    status === "rare_grant_candidate" && input.metadata?.grantApproved === true
      ? createYieldAlphabetEvent({
          input,
          eventType: "value_grant_awarded",
          coinCode: "Y",
          rawScore: grantEligibilityScore,
          qualityScore: moralWeightScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "grant_award",
            status,
            grantTier,
            yieldScore,
            grantEligibilityScore,
            moralWeightScore,
            grantApproved: true,
            reasons
          }
        })
      : null;

  const grantGamingDetectedEvent =
    status === "suspicious" &&
    (reasons.includes("grant_gaming_risk_above_maximum") ||
      reasons.includes("collusion_risk_above_maximum") ||
      reasons.includes("fake_nobility_risk_above_maximum") ||
      reasons.includes("reputation_farming_risk_above_maximum"))
      ? createYieldAlphabetEvent({
          input,
          eventType: "grant_gaming_detected",
          coinCode: "Y",
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  return {
    yieldProfileId: input.yieldProfileId,
    userId: input.userId,
    status,
    grantTier,
    yieldScore,
    grantEligibilityScore,
    moralWeightScore,
    riskScore,
    reasons,
    yieldAccruedEvent,
    grantEligibilityUpdatedEvent,
    rareGrantCandidateEvent,
    valueGrantAwardedEvent,
    grantGamingDetectedEvent,
    metadata: input.metadata ?? {}
  };
}
