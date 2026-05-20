import { beforeEach, describe, expect, it } from "vitest";
import {
  completeLearningSession,
  getLearningSession,
  getLearningVerificationResult,
  resetLearningSessionStoreForTests,
  startLearningSession,
  updateLearningSessionProgress,
  verifyStoredLearningSession
} from "../learning-session-store";

describe("learning-session-store", () => {
  beforeEach(() => {
    resetLearningSessionStoreForTests();
  });

  it("starts learning session", () => {
    const session = startLearningSession({
      userId: crypto.randomUUID(),
      context: "iearn",
      lessonId: crypto.randomUUID(),
      requiredDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    expect(session.status).toBe("started");
    expect(session.watchedDurationMs).toBe(0);

    const stored = getLearningSession(session.learningSessionId);
    expect(stored?.learningSessionId).toBe(session.learningSessionId);
  });

  it("updates learning progress", () => {
    const session = startLearningSession({
      userId: crypto.randomUUID(),
      context: "iearn",
      lessonId: crypto.randomUUID(),
      requiredDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    const updated = updateLearningSessionProgress({
      learningSessionId: session.learningSessionId,
      watchedDurationMs: 5 * 60 * 1000
    });

    expect(updated.watchedDurationMs).toBe(5 * 60 * 1000);
  });

  it("prevents watched duration moving backwards", () => {
    const session = startLearningSession({
      userId: crypto.randomUUID(),
      context: "iearn",
      lessonId: crypto.randomUUID(),
      requiredDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    updateLearningSessionProgress({
      learningSessionId: session.learningSessionId,
      watchedDurationMs: 5 * 60 * 1000
    });

    expect(() =>
      updateLearningSessionProgress({
        learningSessionId: session.learningSessionId,
        watchedDurationMs: 60 * 1000
      })
    ).toThrow();
  });

  it("completes learning session", () => {
    const session = startLearningSession({
      userId: crypto.randomUUID(),
      context: "iearn",
      lessonId: crypto.randomUUID(),
      requiredDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    const completed = completeLearningSession(session.learningSessionId);

    expect(completed.status).toBe("lesson_completed");
    expect(completed.completedAt).toBeTruthy();
  });

  it("verifies stored learning session", () => {
    const session = startLearningSession({
      userId: crypto.randomUUID(),
      context: "iearn",
      lessonId: crypto.randomUUID(),
      requiredDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    updateLearningSessionProgress({
      learningSessionId: session.learningSessionId,
      watchedDurationMs: 10 * 60 * 1000
    });

    completeLearningSession(session.learningSessionId);

    const result = verifyStoredLearningSession({
      learningSessionId: session.learningSessionId,
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
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("knowledge_verified");

    const stored = getLearningVerificationResult(session.learningSessionId);
    expect(stored?.status).toBe("knowledge_verified");
  });
});
