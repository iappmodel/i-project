import { MASTERY_RULES } from "../../data/alphabet/mastery-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  MasteryEvidenceInput,
  MasteryRuleSet,
  MasteryVerificationResult,
  MasteryVerificationStatus
} from "../../types/alphabet/mastery.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: MasteryEvidenceInput): MasteryRuleSet | undefined {
  return MASTERY_RULES.find((rule) => rule.active && rule.domain === input.domain);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateSuccessRate(input: MasteryEvidenceInput): number {
  if (input.attemptCount <= 0) return 0;
  return clamp(input.successfulAttemptCount / input.attemptCount);
}

function calculateValidationScore(input: MasteryEvidenceInput): number {
  const score =
    clamp(input.expertValidationScore) * 0.4 +
    clamp(input.systemValidationScore) * 0.4 +
    clamp(input.peerValidationScore) * 0.2;

  return clamp(score);
}

function calculateDurabilityScore(input: MasteryEvidenceInput): number {
  const spanScore = clamp(input.evidenceSpanDays / 90);
  const consistency = clamp(input.consistencyScore);
  const successRate = calculateSuccessRate(input);

  const score =
    spanScore * 0.35 +
    consistency * 0.35 +
    successRate * 0.2 +
    clamp(input.focusScore) * 0.1;

  return clamp(score);
}

function calculateRiskScore(input: MasteryEvidenceInput): number {
  let risk =
    clamp(input.cheatingRisk) * 0.3 +
    clamp(input.shortcutRisk) * 0.25 +
    clamp(input.validationManipulationRisk) * 0.3 +
    (input.deviceIntegrityScore < 0.5 ? 0.1 : 0) +
    (input.peerValidationScore > 0.9 &&
    input.expertValidationScore < 0.4 &&
    input.systemValidationScore < 0.4
      ? 0.05
      : 0);

  if (input.peakPerformanceScore - input.averagePerformanceScore > 0.35) {
    risk += 0.05;
  }

  if (input.evidenceSpanDays < 2 && input.averagePerformanceScore > 0.9) {
    risk += 0.1;
  }

  return clamp(risk);
}

function calculateMasteryScore(input: MasteryEvidenceInput): number {
  const successRate = calculateSuccessRate(input);
  const validationScore = calculateValidationScore(input);
  const durabilityScore = calculateDurabilityScore(input);

  const difficultyScore = clamp(input.difficultyLevel / 10);

  const score =
    clamp(input.averagePerformanceScore) * 0.2 +
    clamp(input.peakPerformanceScore) * 0.1 +
    clamp(input.consistencyScore) * 0.15 +
    difficultyScore * 0.12 +
    clamp(input.qualityScore) * 0.13 +
    clamp(input.knowledgeScore) * 0.08 +
    clamp(input.growthScore) * 0.07 +
    validationScore * 0.1 +
    durabilityScore * 0.05 +
    successRate * 0.1;

  return clamp(score);
}

function decideMasteryStatus(params: {
  input: MasteryEvidenceInput;
  rule: MasteryRuleSet;
  successRate: number;
  masteryScore: number;
  durabilityScore: number;
  validationScore: number;
  riskScore: number;
  reasons: string[];
}): MasteryVerificationStatus {
  const {
    input,
    rule,
    successRate,
    masteryScore,
    durabilityScore,
    validationScore,
    riskScore,
    reasons
  } = params;

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_mastery_domain");
    return "suspicious";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_mastery_domain");
    return "suspicious";
  }

  if (input.attemptCount < rule.minAttemptCount) {
    reasons.push("attempt_count_below_minimum");
    return "insufficient_evidence";
  }

  if (input.successfulAttemptCount < rule.minSuccessfulAttemptCount) {
    reasons.push("successful_attempt_count_below_minimum");
    return "insufficient_evidence";
  }

  if (successRate < rule.minSuccessRate) {
    reasons.push("success_rate_below_minimum");
    return "inconsistent";
  }

  if (input.averagePerformanceScore < rule.minAveragePerformanceScore) {
    reasons.push("average_performance_below_minimum");
    return "emerging_mastery";
  }

  if (input.peakPerformanceScore < rule.minPeakPerformanceScore) {
    reasons.push("peak_performance_below_minimum");
    return "emerging_mastery";
  }

  if (input.consistencyScore < rule.minConsistencyScore) {
    reasons.push("consistency_below_minimum");
    return "inconsistent";
  }

  if (input.difficultyLevel < rule.minDifficultyLevel) {
    reasons.push("difficulty_below_minimum");
    return "emerging_mastery";
  }

  if (input.qualityScore < rule.minQualityScore) {
    reasons.push("quality_below_minimum");
    return "emerging_mastery";
  }

  if (input.evidenceSpanDays < rule.minEvidenceSpanDays) {
    reasons.push("evidence_span_below_minimum");
    return "insufficient_evidence";
  }

  if (validationScore < rule.minValidationScore) {
    reasons.push("validation_score_below_minimum");
    return "emerging_mastery";
  }

  if (durabilityScore < rule.minDurabilityScore) {
    reasons.push("durability_score_below_minimum");
    return "emerging_mastery";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "suspicious" : "failed";
  }

  if (masteryScore < rule.minMasteryScore) {
    reasons.push("mastery_score_below_minimum");
    return "emerging_mastery";
  }

  reasons.push("mastery_verified");
  return "mastery_verified";
}

function sourceContextFromDomain(
  domain: MasteryEvidenceInput["domain"]
): AlphabetEvent["sourceContext"] {
  switch (domain) {
    case "learning":
    case "knowledge":
      return "learning";
    case "creation":
    case "skill":
    case "art":
    case "mentorship":
      return "creator";
    case "work":
      return "marketplace";
    case "fitness":
    case "general":
      return "system";
    default:
      return "system";
  }
}

function createMasteryAlphabetEvent(params: {
  input: MasteryEvidenceInput;
  status: MasteryVerificationStatus;
  successRate: number;
  masteryScore: number;
  durabilityScore: number;
  validationScore: number;
  riskScore: number;
  reasons: string[];
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "M",
    eventType: "mastery_path_updated",
    objectType: "mastery_path",
    objectId: params.input.masteryPathId,
    sourceContext: sourceContextFromDomain(params.input.domain),
    rawScore: params.masteryScore,
    qualityScore: params.input.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus:
      params.status === "mastery_verified" ||
      params.status === "emerging_mastery"
        ? "verified"
        : "rejected",
    metadata: {
      masteryPathId: params.input.masteryPathId,
      domain: params.input.domain,
      status: params.status,
      attemptCount: params.input.attemptCount,
      successfulAttemptCount: params.input.successfulAttemptCount,
      successRate: params.successRate,
      averagePerformanceScore: params.input.averagePerformanceScore,
      peakPerformanceScore: params.input.peakPerformanceScore,
      consistencyScore: params.input.consistencyScore,
      difficultyLevel: params.input.difficultyLevel,
      masteryScore: params.masteryScore,
      durabilityScore: params.durabilityScore,
      validationScore: params.validationScore,
      reasons: params.reasons,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyMasteryPath(
  input: MasteryEvidenceInput
): MasteryVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const successRate = calculateSuccessRate(input);
  const validationScore = calculateValidationScore(input);
  const durabilityScore = calculateDurabilityScore(input);
  const riskScore = calculateRiskScore(input);
  const masteryScore = calculateMasteryScore(input);

  if (!rule) {
    reasons.push("no_active_mastery_rule");

    return {
      masteryPathId: input.masteryPathId,
      userId: input.userId,
      status: "suspicious",
      successRate,
      masteryScore,
      durabilityScore,
      validationScore,
      riskScore,
      reasons,
      masteryEvent: createMasteryAlphabetEvent({
        input,
        status: "suspicious",
        successRate,
        masteryScore,
        durabilityScore,
        validationScore,
        riskScore,
        reasons
      }),
      metadata: input.metadata ?? {}
    };
  }

  const status = decideMasteryStatus({
    input,
    rule,
    successRate,
    masteryScore,
    durabilityScore,
    validationScore,
    riskScore,
    reasons
  });

  const masteryEvent =
    status === "mastery_verified" || status === "emerging_mastery"
      ? createMasteryAlphabetEvent({
          input,
          status,
          successRate,
          masteryScore,
          durabilityScore,
          validationScore,
          riskScore,
          reasons
        })
      : null;

  return {
    masteryPathId: input.masteryPathId,
    userId: input.userId,
    status,
    successRate,
    masteryScore,
    durabilityScore,
    validationScore,
    riskScore,
    reasons,
    masteryEvent,
    metadata: {
      ruleDomain: rule.domain,
      ...input.metadata
    }
  };
}
