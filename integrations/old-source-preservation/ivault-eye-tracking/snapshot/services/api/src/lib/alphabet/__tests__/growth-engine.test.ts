import { describe, expect, it } from "vitest";
import { verifyGrowthSession } from "../growth-engine";
import type { GrowthSignalInput } from "../../../types/alphabet/growth.types";

function makeInput(
  overrides: Partial<GrowthSignalInput> = {}
): GrowthSignalInput {
  return {
    growthSessionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),

    domain: "learning",

    baselineScore: 0.4,
    afterScore: 0.7,

    practiceCount: 3,
    practiceDurationMs: 20 * 60 * 1000,

    learningScore: 0.85,
    knowledgeScore: 0.75,
    focusScore: 0.8,
    masterySignalScore: 0.4,

    difficultyLevel: 6,

    repeatedAttemptCount: 2,
    easyAttemptRatio: 0.2,

    cheatingRisk: 0.03,
    scoreManipulationRisk: 0.03,
    repeatedAttemptFarmingRisk: 0.03,
    deviceIntegrityScore: 0.9,

    ageBand: "18_plus",

    metadata: {},
    ...overrides
  };
}

describe("growth-engine", () => {
  it("verifies clear growth", () => {
    const result = verifyGrowthSession(makeInput());

    expect(result.status).toBe("growth_verified");
    expect(result.improvementDelta).toBeGreaterThan(0.2);
    expect(result.normalizedGrowth).toBeGreaterThan(0.3);
    expect(result.growthScore).toBeGreaterThan(0.55);
    expect(result.growthEvent?.eventType).toBe("growth_detected");
  });

  it("detects small growth", () => {
    const result = verifyGrowthSession(
      makeInput({
        baselineScore: 0.7,
        afterScore: 0.74
      })
    );

    expect(result.status).toBe("small_growth");
    expect(result.reasons).toContain("improvement_below_growth_threshold");
  });

  it("detects no growth", () => {
    const result = verifyGrowthSession(
      makeInput({
        baselineScore: 0.7,
        afterScore: 0.7
      })
    );

    expect(result.status).toBe("no_growth");
    expect(result.growthEvent).toBeNull();
  });

  it("detects regression", () => {
    const result = verifyGrowthSession(
      makeInput({
        baselineScore: 0.8,
        afterScore: 0.6
      })
    );

    expect(result.status).toBe("regression");
    expect(result.reasons).toContain("after_score_below_baseline");
  });

  it("marks insufficient practice as incomplete", () => {
    const result = verifyGrowthSession(
      makeInput({
        practiceCount: 0
      })
    );

    expect(result.status).toBe("incomplete");
    expect(result.reasons).toContain("practice_count_below_minimum");
  });

  it("marks easy attempt farming as suspicious", () => {
    const result = verifyGrowthSession(
      makeInput({
        easyAttemptRatio: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("easy_attempt_ratio_above_maximum");
  });

  it("marks repeated attempts as suspicious", () => {
    const result = verifyGrowthSession(
      makeInput({
        repeatedAttemptCount: 99
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("repeated_attempt_count_above_maximum");
  });

  it("marks high risk as suspicious", () => {
    const result = verifyGrowthSession(
      makeInput({
        cheatingRisk: 1,
        scoreManipulationRisk: 1,
        repeatedAttemptFarmingRisk: 1
      })
    );

    expect(["suspicious", "no_growth"]).toContain(result.status);
    expect(result.reasons).toContain("risk_score_above_maximum");
  });

  it("blocks under 13 work domain", () => {
    const result = verifyGrowthSession(
      makeInput({
        domain: "work",
        ageBand: "under_13"
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_not_allowed_for_growth_domain");
  });
});
