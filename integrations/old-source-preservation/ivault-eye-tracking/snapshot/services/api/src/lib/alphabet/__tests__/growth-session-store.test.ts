import { beforeEach, describe, expect, it } from "vitest";
import {
  getGrowthSession,
  getGrowthVerificationResult,
  recordGrowthAfterScore,
  recordGrowthPractice,
  resetGrowthSessionStoreForTests,
  startGrowthSession,
  verifyStoredGrowthSession
} from "../growth-session-store";

describe("growth-session-store", () => {
  beforeEach(() => {
    resetGrowthSessionStoreForTests();
  });

  it("starts growth session", () => {
    const session = startGrowthSession({
      userId: crypto.randomUUID(),
      domain: "learning",
      baselineScore: 0.4,
      difficultyLevel: 6,
      ageBand: "18_plus"
    });

    expect(session.status).toBe("baseline_recorded");
    expect(session.baselineScore).toBe(0.4);

    const stored = getGrowthSession(session.growthSessionId);
    expect(stored?.growthSessionId).toBe(session.growthSessionId);
  });

  it("records practice", () => {
    const session = startGrowthSession({
      userId: crypto.randomUUID(),
      domain: "learning",
      baselineScore: 0.4,
      difficultyLevel: 6,
      ageBand: "18_plus"
    });

    const updated = recordGrowthPractice({
      growthSessionId: session.growthSessionId,
      practiceCountDelta: 2,
      practiceDurationMsDelta: 10 * 60 * 1000
    });

    expect(updated.practiceCount).toBe(2);
    expect(updated.practiceDurationMs).toBe(10 * 60 * 1000);
  });

  it("records after score", () => {
    const session = startGrowthSession({
      userId: crypto.randomUUID(),
      domain: "learning",
      baselineScore: 0.4,
      difficultyLevel: 6,
      ageBand: "18_plus"
    });

    const updated = recordGrowthAfterScore({
      growthSessionId: session.growthSessionId,
      afterScore: 0.7
    });

    expect(updated.afterScore).toBe(0.7);
    expect(updated.status).toBe("after_score_recorded");
  });

  it("verifies stored growth session", () => {
    const session = startGrowthSession({
      userId: crypto.randomUUID(),
      domain: "learning",
      baselineScore: 0.4,
      difficultyLevel: 6,
      ageBand: "18_plus"
    });

    recordGrowthPractice({
      growthSessionId: session.growthSessionId,
      practiceCountDelta: 3,
      practiceDurationMsDelta: 20 * 60 * 1000
    });

    recordGrowthAfterScore({
      growthSessionId: session.growthSessionId,
      afterScore: 0.7
    });

    const result = verifyStoredGrowthSession({
      growthSessionId: session.growthSessionId,

      learningScore: 0.85,
      knowledgeScore: 0.75,
      focusScore: 0.8,
      masterySignalScore: 0.4,

      repeatedAttemptCount: 2,
      easyAttemptRatio: 0.2,

      cheatingRisk: 0.03,
      scoreManipulationRisk: 0.03,
      repeatedAttemptFarmingRisk: 0.03,
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("growth_verified");

    const stored = getGrowthVerificationResult(session.growthSessionId);
    expect(stored?.status).toBe("growth_verified");
  });

  it("throws if verifying before after score", () => {
    const session = startGrowthSession({
      userId: crypto.randomUUID(),
      domain: "learning",
      baselineScore: 0.4,
      difficultyLevel: 6,
      ageBand: "18_plus"
    });

    expect(() =>
      verifyStoredGrowthSession({
        growthSessionId: session.growthSessionId,

        learningScore: 0.85,
        knowledgeScore: 0.75,
        focusScore: 0.8,
        masterySignalScore: 0.4,

        repeatedAttemptCount: 2,
        easyAttemptRatio: 0.2,

        cheatingRisk: 0.03,
        scoreManipulationRisk: 0.03,
        repeatedAttemptFarmingRisk: 0.03,
        deviceIntegrityScore: 0.9
      })
    ).toThrow();
  });
});
