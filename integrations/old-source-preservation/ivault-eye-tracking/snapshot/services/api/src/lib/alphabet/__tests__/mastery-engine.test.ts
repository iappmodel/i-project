import { describe, expect, it } from "vitest";
import { verifyMasteryPath } from "../mastery-engine";
import type { MasteryEvidenceInput } from "../../../types/alphabet/mastery.types";

function makeInput(
  overrides: Partial<MasteryEvidenceInput> = {}
): MasteryEvidenceInput {
  return {
    masteryPathId: crypto.randomUUID(),
    userId: crypto.randomUUID(),

    domain: "learning",

    attemptCount: 7,
    successfulAttemptCount: 6,

    averagePerformanceScore: 0.88,
    peakPerformanceScore: 0.94,
    consistencyScore: 0.86,

    difficultyLevel: 7,

    qualityScore: 0.86,
    growthScore: 0.8,
    knowledgeScore: 0.85,
    focusScore: 0.82,

    expertValidationScore: 0.75,
    peerValidationScore: 0.65,
    systemValidationScore: 0.82,

    evidenceSpanDays: 21,

    cheatingRisk: 0.03,
    shortcutRisk: 0.03,
    validationManipulationRisk: 0.03,
    deviceIntegrityScore: 0.9,

    ageBand: "18_plus",

    metadata: {},
    ...overrides
  };
}

describe("mastery-engine", () => {
  it("verifies strong mastery", () => {
    const result = verifyMasteryPath(makeInput());

    expect(result.status).toBe("mastery_verified");
    expect(result.masteryScore).toBeGreaterThan(0.75);
    expect(result.validationScore).toBeGreaterThan(0.65);
    expect(result.durabilityScore).toBeGreaterThan(0.6);
    expect(result.masteryEvent?.eventType).toBe("mastery_path_updated");
  });

  it("returns insufficient evidence for too few attempts", () => {
    const result = verifyMasteryPath(
      makeInput({
        attemptCount: 2,
        successfulAttemptCount: 2
      })
    );

    expect(result.status).toBe("insufficient_evidence");
    expect(result.reasons).toContain("attempt_count_below_minimum");
    expect(result.masteryEvent).toBeNull();
  });

  it("returns inconsistent when success rate is low", () => {
    const result = verifyMasteryPath(
      makeInput({
        attemptCount: 10,
        successfulAttemptCount: 4
      })
    );

    expect(result.status).toBe("inconsistent");
    expect(result.reasons).toContain("success_rate_below_minimum");
  });

  it("returns emerging mastery when average performance is not high enough", () => {
    const result = verifyMasteryPath(
      makeInput({
        averagePerformanceScore: 0.7
      })
    );

    expect(result.status).toBe("emerging_mastery");
    expect(result.reasons).toContain("average_performance_below_minimum");
    expect(result.masteryEvent?.eventType).toBe("mastery_path_updated");
  });

  it("returns emerging mastery when difficulty is too low", () => {
    const result = verifyMasteryPath(
      makeInput({
        difficultyLevel: 2
      })
    );

    expect(result.status).toBe("emerging_mastery");
    expect(result.reasons).toContain("difficulty_below_minimum");
  });

  it("returns insufficient evidence when evidence span is too short", () => {
    const result = verifyMasteryPath(
      makeInput({
        evidenceSpanDays: 1
      })
    );

    expect(result.status).toBe("insufficient_evidence");
    expect(result.reasons).toContain("evidence_span_below_minimum");
  });

  it("detects suspicious validation manipulation", () => {
    const result = verifyMasteryPath(
      makeInput({
        validationManipulationRisk: 1,
        cheatingRisk: 1,
        shortcutRisk: 1
      })
    );

    expect(["suspicious", "failed"]).toContain(result.status);
    expect(result.reasons).toContain("risk_score_above_maximum");
  });

  it("blocks under 13 work mastery", () => {
    const result = verifyMasteryPath(
      makeInput({
        domain: "work",
        ageBand: "under_13"
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_not_allowed_for_mastery_domain");
  });
});
