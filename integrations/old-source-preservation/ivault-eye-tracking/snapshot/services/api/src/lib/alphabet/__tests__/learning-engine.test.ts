import { describe, expect, it } from "vitest";
import type { LearningSignalInput } from "../../../types/alphabet/learning.types";
import { verifyLearningSession } from "../learning-engine";

function makeInput(overrides: Partial<LearningSignalInput> = {}): LearningSignalInput {
  return {
    learningSessionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    context: "iearn",
    requiredDurationMs: 10 * 60 * 1000,
    watchedDurationMs: 10 * 60 * 1000,
    attentionScore: 0.9,
    focusScore: 0.85,
    focusMultiplier: 1.1,
    quizScore: 0.9,
    quizQuestionCount: 10,
    quizCorrectCount: 9,
    recallScore: 0.85,
    recallDelayHours: 24,
    applicationScore: 0.8,
    practiceCompletionScore: 0.85,
    explanationQualityScore: 0.8,
    cheatingRisk: 0.03,
    aiAnswerRisk: 0.03,
    answerCopyRisk: 0.02,
    velocityRisk: 0.04,
    deviceIntegrityScore: 0.9,
    ageBand: "18_plus",
    metadata: {},
    ...overrides
  };
}

describe("learning-engine", () => {
  it("verifies strong learning as knowledge_verified", () => {
    const result = verifyLearningSession(makeInput());

    expect(result.status).toBe("knowledge_verified");
    expect(result.learningScore).toBeGreaterThan(0.7);
    expect(result.knowledgeScore).toBeGreaterThan(0.7);
    expect(result.learningEvent?.eventType).toBe("learning_verified");
    expect(result.knowledgeEvent?.eventType).toBe("knowledge_verified");
  });

  it("verifies learning without strong knowledge as learned", () => {
    const result = verifyLearningSession(
      makeInput({
        recallScore: 0.4,
        applicationScore: 0.4,
        recallDelayHours: 0
      })
    );

    expect(["learned", "partially_learned"]).toContain(result.status);
    expect(result.learningEvent?.eventType).toBe("learning_verified");
    expect(result.knowledgeEvent).toBeNull();
  });

  it("fails low quiz score", () => {
    const result = verifyLearningSession(
      makeInput({
        quizScore: 0.3,
        quizCorrectCount: 3
      })
    );

    expect(result.status).toBe("failed");
    expect(result.reasons).toContain("quiz_score_below_minimum");
  });

  it("marks high cheating risk as suspicious", () => {
    const result = verifyLearningSession(
      makeInput({
        cheatingRisk: 1,
        aiAnswerRisk: 1,
        answerCopyRisk: 1,
        velocityRisk: 1
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("risk_score_above_maximum");
  });

  it("marks incomplete watch as incomplete", () => {
    const result = verifyLearningSession(
      makeInput({
        watchedDurationMs: 2 * 60 * 1000,
        requiredDurationMs: 10 * 60 * 1000
      })
    );

    expect(result.status).toBe("incomplete");
    expect(result.reasons).toContain("watched_ratio_below_minimum");
  });

  it("blocks under 13 iearn without guardian approval", () => {
    const result = verifyLearningSession(
      makeInput({
        ageBand: "under_13",
        context: "iearn",
        metadata: { guardianApproved: false }
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_requires_guardian_or_school_context");
  });

  it("allows under 13 school context", () => {
    const result = verifyLearningSession(
      makeInput({
        ageBand: "under_13",
        context: "school"
      })
    );

    expect(result.status).toBe("knowledge_verified");
  });

  it("boosts delayed recall into stronger knowledge score", () => {
    const immediate = verifyLearningSession(
      makeInput({
        recallDelayHours: 0
      })
    );

    const delayed = verifyLearningSession(
      makeInput({
        recallDelayHours: 72
      })
    );

    expect(delayed.knowledgeScore).toBeGreaterThan(immediate.knowledgeScore);
  });
});
