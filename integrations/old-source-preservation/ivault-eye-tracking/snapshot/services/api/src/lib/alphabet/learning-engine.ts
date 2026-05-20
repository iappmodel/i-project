import { LEARNING_RULES } from "../../data/alphabet/learning-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  LearningRuleSet,
  LearningSignalInput,
  LearningVerificationResult,
  LearningVerificationStatus
} from "../../types/alphabet/learning.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: LearningSignalInput): LearningRuleSet | undefined {
  return LEARNING_RULES.find((rule) => rule.active && rule.context === input.context);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateWatchedRatio(input: LearningSignalInput): number {
  if (input.requiredDurationMs <= 0) return 0;
  return clamp(input.watchedDurationMs / input.requiredDurationMs);
}

function calculateLearningScore(input: LearningSignalInput): number {
  const watchedRatio = calculateWatchedRatio(input);
  const score =
    watchedRatio * 0.15 +
    clamp(input.attentionScore) * 0.15 +
    clamp(input.focusScore) * 0.15 +
    clamp(input.quizScore) * 0.2 +
    clamp(input.practiceCompletionScore) * 0.15 +
    clamp(input.explanationQualityScore) * 0.1 +
    clamp(input.applicationScore) * 0.1;
  const focusBoost = Math.min(1.15, Math.max(0.75, input.focusMultiplier || 1));
  return clamp(score * focusBoost);
}

function calculateKnowledgeScore(input: LearningSignalInput): number {
  const recallDelayBoost =
    input.recallDelayHours >= 72
      ? 1.25
      : input.recallDelayHours >= 24
        ? 1.15
        : input.recallDelayHours >= 4
          ? 1.05
          : 0.9;

  const score =
    clamp(input.quizScore) * 0.25 +
    clamp(input.recallScore) * 0.35 +
    clamp(input.applicationScore) * 0.25 +
    clamp(input.explanationQualityScore) * 0.15;

  return clamp(score * recallDelayBoost);
}

function calculateQualityScore(input: LearningSignalInput): number {
  const questionCountConfidence =
    input.quizQuestionCount >= 10 ? 1 : input.quizQuestionCount >= 5 ? 0.85 : 0.65;

  const correctnessIntegrity =
    input.quizQuestionCount > 0 ? clamp(input.quizCorrectCount / input.quizQuestionCount) : 0;

  const score =
    clamp(input.quizScore) * 0.25 +
    correctnessIntegrity * 0.2 +
    clamp(input.recallScore) * 0.2 +
    clamp(input.applicationScore) * 0.2 +
    clamp(input.explanationQualityScore) * 0.15;

  return clamp(score * questionCountConfidence);
}

function calculateRiskScore(input: LearningSignalInput): number {
  const risk =
    clamp(input.cheatingRisk) * 0.3 +
    clamp(input.aiAnswerRisk) * 0.25 +
    clamp(input.answerCopyRisk) * 0.2 +
    clamp(input.velocityRisk) * 0.15 +
    (input.deviceIntegrityScore < 0.5 ? 0.1 : 0);

  return clamp(risk);
}

function decideLearningStatus(params: {
  input: LearningSignalInput;
  rule: LearningRuleSet;
  watchedRatio: number;
  learningScore: number;
  knowledgeScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
}): LearningVerificationStatus {
  const { input, rule, watchedRatio, learningScore, knowledgeScore, qualityScore, riskScore, reasons } =
    params;

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_learning_context");
    return "suspicious";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_learning_context");
    return "suspicious";
  }

  if (
    isUnder13(input.ageBand) &&
    rule.requiresGuardianOrSchoolForUnder13 &&
    input.context !== "school" &&
    !input.metadata?.guardianApproved
  ) {
    reasons.push("under_13_requires_guardian_or_school_context");
    return "suspicious";
  }

  if (watchedRatio < rule.minWatchedRatio) {
    reasons.push("watched_ratio_below_minimum");
    return watchedRatio < 0.5 ? "incomplete" : "failed";
  }

  if (input.attentionScore < rule.minAttentionScore) {
    reasons.push("attention_score_below_minimum");
    return "failed";
  }

  if (input.focusScore < rule.minFocusScore) {
    reasons.push("focus_score_below_minimum");
    return "partially_learned";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "suspicious" : "failed";
  }

  if (input.quizScore < rule.minQuizScore) {
    reasons.push("quiz_score_below_minimum");
    return "failed";
  }

  if (qualityScore < rule.minQualityScore) {
    reasons.push("quality_score_below_minimum");
    return "partially_learned";
  }

  if (learningScore < rule.minLearningScore) {
    reasons.push("learning_score_below_minimum");
    return "partially_learned";
  }

  const knowledgeStrong =
    knowledgeScore >= rule.minKnowledgeScore &&
    input.recallScore >= rule.minRecallScore &&
    input.applicationScore >= rule.minApplicationScore &&
    input.practiceCompletionScore >= rule.minPracticeCompletionScore;

  if (knowledgeStrong) {
    reasons.push("knowledge_verified");
    return "knowledge_verified";
  }

  reasons.push("learning_verified");
  return "learned";
}

function sourceContextFromLearningContext(
  context: LearningSignalInput["context"]
): AlphabetEvent["sourceContext"] {
  switch (context) {
    case "brand_training":
      return "campaign";
    case "creator_course":
      return "creator";
    case "iearn":
    case "school":
    case "self_study":
    case "tutoring":
      return "learning";
    default:
      return "learning";
  }
}

function createLearningAlphabetEvent(params: {
  input: LearningSignalInput;
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
    objectType: "learning_session",
    objectId: params.input.learningSessionId,
    sourceContext: sourceContextFromLearningContext(params.input.context),
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      learningSessionId: params.input.learningSessionId,
      context: params.input.context,
      watchedDurationMs: params.input.watchedDurationMs,
      requiredDurationMs: params.input.requiredDurationMs,
      quizScore: params.input.quizScore,
      recallScore: params.input.recallScore,
      applicationScore: params.input.applicationScore,
      practiceCompletionScore: params.input.practiceCompletionScore,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyLearningSession(input: LearningSignalInput): LearningVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);
  const watchedRatio = calculateWatchedRatio(input);
  const learningScore = calculateLearningScore(input);
  const knowledgeScore = calculateKnowledgeScore(input);
  const qualityScore = calculateQualityScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_learning_rule");

    const lessonCompletedEvent = createLearningAlphabetEvent({
      input,
      eventType: "lesson_completed",
      coinCode: "L",
      rawScore: learningScore,
      qualityScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      learningSessionId: input.learningSessionId,
      userId: input.userId,
      status: "suspicious",
      watchedRatio,
      learningScore,
      knowledgeScore,
      qualityScore,
      riskScore,
      reasons,
      lessonCompletedEvent,
      quizSubmittedEvent: null,
      learningEvent: null,
      knowledgeEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideLearningStatus({
    input,
    rule,
    watchedRatio,
    learningScore,
    knowledgeScore,
    qualityScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "learned" || status === "knowledge_verified" || status === "partially_learned"
      ? "verified"
      : "rejected";

  const lessonCompletedEvent = createLearningAlphabetEvent({
    input,
    eventType: "lesson_completed",
    coinCode: "L",
    rawScore: watchedRatio,
    qualityScore,
    riskScore,
    verificationStatus,
    metadata: { reasons }
  });

  const quizSubmittedEvent = createLearningAlphabetEvent({
    input,
    eventType: "quiz_submitted",
    coinCode: "L",
    rawScore: input.quizScore,
    qualityScore,
    riskScore,
    verificationStatus,
    metadata: {
      quizQuestionCount: input.quizQuestionCount,
      quizCorrectCount: input.quizCorrectCount,
      reasons
    }
  });

  const learningEvent =
    status === "learned" || status === "knowledge_verified" || status === "partially_learned"
      ? createLearningAlphabetEvent({
          input,
          eventType: "learning_verified",
          coinCode: "L",
          rawScore: learningScore,
          qualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            learningScore,
            knowledgeScore,
            reasons
          }
        })
      : null;

  const knowledgeEvent =
    status === "knowledge_verified"
      ? createLearningAlphabetEvent({
          input,
          eventType: "knowledge_verified",
          coinCode: "K",
          rawScore: knowledgeScore,
          qualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            recallDelayHours: input.recallDelayHours,
            learningScore,
            knowledgeScore,
            reasons
          }
        })
      : null;

  return {
    learningSessionId: input.learningSessionId,
    userId: input.userId,
    status,
    watchedRatio,
    learningScore,
    knowledgeScore,
    qualityScore,
    riskScore,
    reasons,
    lessonCompletedEvent,
    quizSubmittedEvent,
    learningEvent,
    knowledgeEvent,
    metadata: {
      ruleContext: rule.context,
      ...input.metadata
    }
  };
}
