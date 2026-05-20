import { beforeEach, describe, expect, it } from "vitest";
import {
  getMasteryPath,
  getMasteryVerificationResult,
  recordMasteryEvidence,
  resetMasterySessionStoreForTests,
  startMasteryPath,
  verifyStoredMasteryPath
} from "../mastery-session-store";

describe("mastery-session-store", () => {
  beforeEach(() => {
    resetMasterySessionStoreForTests();
  });

  it("starts mastery path", () => {
    const path = startMasteryPath({
      userId: crypto.randomUUID(),
      domain: "learning",
      ageBand: "18_plus"
    });

    expect(path.status).toBe("started");
    expect(path.attemptCount).toBe(0);

    const stored = getMasteryPath(path.masteryPathId);
    expect(stored?.masteryPathId).toBe(path.masteryPathId);
  });

  it("records mastery evidence", () => {
    const path = startMasteryPath({
      userId: crypto.randomUUID(),
      domain: "learning",
      ageBand: "18_plus"
    });

    const updated = recordMasteryEvidence({
      masteryPathId: path.masteryPathId,
      attemptCountDelta: 7,
      successfulAttemptCountDelta: 6
    });

    expect(updated.attemptCount).toBe(7);
    expect(updated.successfulAttemptCount).toBe(6);
    expect(updated.status).toBe("evidence_recorded");
  });

  it("rejects successful delta greater than attempt delta", () => {
    const path = startMasteryPath({
      userId: crypto.randomUUID(),
      domain: "learning",
      ageBand: "18_plus"
    });

    expect(() =>
      recordMasteryEvidence({
        masteryPathId: path.masteryPathId,
        attemptCountDelta: 1,
        successfulAttemptCountDelta: 2
      })
    ).toThrow();
  });

  it("verifies stored mastery path", () => {
    const path = startMasteryPath({
      userId: crypto.randomUUID(),
      domain: "learning",
      ageBand: "18_plus"
    });

    recordMasteryEvidence({
      masteryPathId: path.masteryPathId,
      attemptCountDelta: 7,
      successfulAttemptCountDelta: 6
    });

    const result = verifyStoredMasteryPath({
      masteryPathId: path.masteryPathId,

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
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("mastery_verified");

    const stored = getMasteryVerificationResult(path.masteryPathId);
    expect(stored?.status).toBe("mastery_verified");
  });
});
