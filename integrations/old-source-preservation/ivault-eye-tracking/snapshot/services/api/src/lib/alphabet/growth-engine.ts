import { GROWTH_RULES } from "../../data/alphabet/growth-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  GrowthRuleSet,
  GrowthSignalInput,
  GrowthVerificationResult,
  GrowthVerificationStatus
} from "../../types/alphabet/growth.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: GrowthSignalInput): GrowthRuleSet | undefined {
  return GROWTH_RULES.find((rule) => rule.active && rule.domain === input.domain);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateImprovementDelta(input: GrowthSignalInput): number {
  return Number((clamp(input.afterScore) - clamp(input.baselineScore)).toFixed(4));
}

function calculateNormalizedGrowth(input: GrowthSignalInput): number {
  const baseline = clamp(input.baselineScore);
  const after = clamp(input.afterScore);

  if (after <= baseline) return 0;

  const remainingPossibleGrowth = Math.max(0.0001, 1 - baseline);
  return clamp((after - baseline) / remainingPossibleGrowth);
}

function calculatePracticeStrength(input: GrowthSignalInput): number {
  const practiceCountScore = clamp(input.practiceCount / 10);
  const durationScore = clamp(input.practiceDurationMs / (60 * 60 * 1000));

  return clamp(practiceCountScore * 0.45 + durationScore * 0.55);
}

function calculateGrowthScore(input: GrowthSignalInput): number {
  const improvementDelta = Math.max(0, calculateImprovementDelta(input));
  const normalizedGrowth = calculateNormalizedGrowth(input);
  const practiceStrength = calculatePracticeStrength(input);

  const difficultyBoost = clamp(input.difficultyLevel / 10) * 0.15;

  const score =
    clamp(improvementDelta) * 0.3 +
    normalizedGrowth * 0.3 +
    practiceStrength * 0.15 +
    clamp(input.learningScore) * 0.08 +
    clamp(input.knowledgeScore) * 0.08 +
    clamp(input.focusScore) * 0.06 +
    clamp(input.masterySignalScore) * 0.03 +
    difficultyBoost;

  return clamp(score);
}

function calculateQualityScore(input: GrowthSignalInput): number {
  const difficultyScore = clamp(input.difficultyLevel / 10);
  const practiceStrength = calculatePracticeStrength(input);

  const antiEasyPenalty = 1 - clamp(input.easyAttemptRatio) * 0.4;
  const repeatedPenalty = 1 - clamp(input.repeatedAttemptCount / 20) * 0.3;

  const score =
    practiceStrength * 0.2 +
    clamp(input.learningScore) * 0.2 +
    clamp(input.knowledgeScore) * 0.2 +
    clamp(input.focusScore) * 0.2 +
    difficultyScore * 0.1 +
    clamp(input.masterySignalScore) * 0.1;

  return clamp(score * antiEasyPenalty * repeatedPenalty);
}

function calculateRiskScore(input: GrowthSignalInput): number {
  let risk =
    clamp(input.cheatingRisk) * 0.3 +
    clamp(input.scoreManipulationRisk) * 0.3 +
    clamp(input.repeatedAttemptFarmingRisk) * 0.2 +
    (input.deviceIntegrityScore < 0.5 ? 0.1 : 0) +
    (input.easyAttemptRatio > 0.8 ? 0.05 : 0) +
    (input.repeatedAttemptCount > 12 ? 0.05 : 0);

  const delta = calculateImprovementDelta(input);

  if (delta > 0.7 && input.practiceDurationMs < 5 * 60 * 1000) {
    risk += 0.15;
  }

  if (delta > 0.5 && input.practiceCount <= 1) {
    risk += 0.1;
  }

  return clamp(risk);
}

function decideGrowthStatus(params: {
  input: GrowthSignalInput;
  rule: GrowthRuleSet;
  improvementDelta: number;
  normalizedGrowth: number;
  growthScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
}): GrowthVerificationStatus {
  const {
    input,
    rule,
    improvementDelta,
    normalizedGrowth,
    growthScore,
    qualityScore,
    riskScore,
    reasons
  } = params;

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_growth_domain");
    return "suspicious";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_growth_domain");
    return "suspicious";
  }

  if (input.afterScore < input.baselineScore) {
    reasons.push("after_score_below_baseline");
    return "regression";
  }

  if (input.afterScore === input.baselineScore) {
    reasons.push("no_improvement_delta");
    return "no_growth";
  }

  if (input.practiceCount < rule.minPracticeCount) {
    reasons.push("practice_count_below_minimum");
    return "incomplete";
  }

  if (input.practiceDurationMs < rule.minPracticeDurationMs) {
    reasons.push("practice_duration_below_minimum");
    return "incomplete";
  }

  if (input.easyAttemptRatio > rule.maxEasyAttemptRatio) {
    reasons.push("easy_attempt_ratio_above_maximum");
    return "suspicious";
  }

  if (input.repeatedAttemptCount > rule.maxRepeatedAttemptCount) {
    reasons.push("repeated_attempt_count_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "suspicious" : "no_growth";
  }

  if (
    improvementDelta < rule.minImprovementDelta ||
    normalizedGrowth < rule.minNormalizedGrowth
  ) {
    reasons.push("improvement_below_growth_threshold");
    return "small_growth";
  }

  if (qualityScore < rule.minQualityScore) {
    reasons.push("quality_score_below_minimum");
    return "small_growth";
  }

  if (growthScore < rule.minGrowthScore) {
    reasons.push("growth_score_below_minimum");
    return "small_growth";
  }

  reasons.push("growth_verified");
  return "growth_verified";
}

function sourceContextFromDomain(
  domain: GrowthSignalInput["domain"]
): AlphabetEvent["sourceContext"] {
  switch (domain) {
    case "learning":
    case "knowledge":
      return "learning";
    case "mastery":
    case "creation":
      return "creator";
    case "work":
      return "marketplace";
    case "fitness":
    case "habit":
    case "general_skill":
      return "system";
    default:
      return "system";
  }
}

function createGrowthAlphabetEvent(params: {
  input: GrowthSignalInput;
  status: GrowthVerificationStatus;
  improvementDelta: number;
  normalizedGrowth: number;
  growthScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "G",
    eventType: "growth_detected",
    objectType: "growth_session",
    objectId: params.input.growthSessionId,
    sourceContext: sourceContextFromDomain(params.input.domain),
    rawScore: params.growthScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus:
      params.status === "growth_verified" || params.status === "small_growth"
        ? "verified"
        : "rejected",
    metadata: {
      growthSessionId: params.input.growthSessionId,
      domain: params.input.domain,
      baselineScore: params.input.baselineScore,
      afterScore: params.input.afterScore,
      improvementDelta: params.improvementDelta,
      normalizedGrowth: params.normalizedGrowth,
      practiceCount: params.input.practiceCount,
      practiceDurationMs: params.input.practiceDurationMs,
      difficultyLevel: params.input.difficultyLevel,
      status: params.status,
      reasons: params.reasons,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyGrowthSession(
  input: GrowthSignalInput
): GrowthVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const improvementDelta = calculateImprovementDelta(input);
  const normalizedGrowth = calculateNormalizedGrowth(input);
  const growthScore = calculateGrowthScore(input);
  const qualityScore = calculateQualityScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_growth_rule");

    return {
      growthSessionId: input.growthSessionId,
      userId: input.userId,
      status: "suspicious",
      improvementDelta,
      normalizedGrowth,
      growthScore,
      qualityScore,
      riskScore,
      reasons,
      growthEvent: createGrowthAlphabetEvent({
        input,
        status: "suspicious",
        improvementDelta,
        normalizedGrowth,
        growthScore,
        qualityScore,
        riskScore,
        reasons
      }),
      metadata: input.metadata ?? {}
    };
  }

  const status = decideGrowthStatus({
    input,
    rule,
    improvementDelta,
    normalizedGrowth,
    growthScore,
    qualityScore,
    riskScore,
    reasons
  });

  const growthEvent =
    status === "growth_verified" || status === "small_growth"
      ? createGrowthAlphabetEvent({
          input,
          status,
          improvementDelta,
          normalizedGrowth,
          growthScore,
          qualityScore,
          riskScore,
          reasons
        })
      : null;

  return {
    growthSessionId: input.growthSessionId,
    userId: input.userId,
    status,
    improvementDelta,
    normalizedGrowth,
    growthScore,
    qualityScore,
    riskScore,
    reasons,
    growthEvent,
    metadata: {
      ruleDomain: rule.domain,
      ...input.metadata
    }
  };
}
