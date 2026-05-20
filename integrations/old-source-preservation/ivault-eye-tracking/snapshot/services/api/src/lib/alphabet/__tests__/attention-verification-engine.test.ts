import { describe, expect, it } from "vitest";
import { verifyAttentionSession } from "../attention-verification-engine";
import type { AttentionSignalInput } from "../../../types/alphabet/attention.types";

function makeInput(
  overrides: Partial<AttentionSignalInput> = {}
): AttentionSignalInput {
  return {
    attentionSessionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),

    watchedDurationMs: 30000,
    requiredDurationMs: 30000,

    visibilityPercent: 0.95,
    foregroundPercent: 0.95,

    focusStabilityScore: 0.85,
    scrollStabilityScore: 0.8,
    interactionIntegrityScore: 0.8,

    muted: false,
    skipped: false,
    replayLoopDetected: false,
    tabHidden: false,
    screenOffDetected: false,

    deviceIntegrityScore: 0.9,
    sessionContinuityScore: 0.9,
    networkIntegrityScore: 0.9,

    botSignalScore: 0.05,
    duplicateSessionRisk: 0.05,
    velocityRisk: 0.05,
    emulatorRisk: 0.05,

    ageBand: "18_plus",
    context: "campaign",

    metadata: {},
    ...overrides
  };
}

describe("attention-verification-engine", () => {
  it("verifies clean campaign attention", () => {
    const result = verifyAttentionSession(makeInput());

    expect(result.status).toBe("verified");
    expect(result.rawAttentionScore).toBeGreaterThan(0.8);
    expect(result.qualityScore).toBeGreaterThan(0.7);
    expect(result.riskScore).toBeLessThan(0.2);
    expect(result.event.eventType).toBe("attention_verified");
  });

  it("rejects incomplete watch duration", () => {
    const result = verifyAttentionSession(
      makeInput({
        watchedDurationMs: 10000,
        requiredDurationMs: 30000
      })
    );

    expect(result.status).toBe("incomplete");
    expect(result.reasons).toContain("watched_ratio_below_minimum");
  });

  it("rejects low visibility", () => {
    const result = verifyAttentionSession(
      makeInput({
        visibilityPercent: 0.2
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("visibility_below_minimum");
  });

  it("marks low focus as suspicious", () => {
    const result = verifyAttentionSession(
      makeInput({
        focusStabilityScore: 0.1
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("focus_stability_below_minimum");
  });

  it("rejects replay loops", () => {
    const result = verifyAttentionSession(
      makeInput({
        replayLoopDetected: true
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("replay_loop_detected");
  });

  it("rejects high risk", () => {
    const result = verifyAttentionSession(
      makeInput({
        botSignalScore: 1,
        duplicateSessionRisk: 1,
        velocityRisk: 1,
        emulatorRisk: 1
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("risk_score_above_maximum");
  });

  it("rejects under 13 campaign attention", () => {
    const result = verifyAttentionSession(
      makeInput({
        ageBand: "under_13",
        context: "campaign"
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("under_13_not_allowed_for_context");
  });

  it("allows under 13 learning attention if clean", () => {
    const result = verifyAttentionSession(
      makeInput({
        ageBand: "under_13",
        context: "learning",
        muted: false,
        watchedDurationMs: 30000,
        requiredDurationMs: 30000
      })
    );

    expect(result.status).toBe("verified");
  });

  it("rejects muted learning session", () => {
    const result = verifyAttentionSession(
      makeInput({
        context: "learning",
        muted: true
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("muted_not_allowed");
  });
});
