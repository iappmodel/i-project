import { describe, expect, it } from "vitest";
import { verifyFocusSession } from "../focus-engine";
import type { FocusSignalInput } from "../../../types/alphabet/focus.types";

function makeInput(overrides: Partial<FocusSignalInput> = {}): FocusSignalInput {
  return {
    focusSessionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    purpose: "learning",
    focusedDurationMs: 10 * 60 * 1000,
    intendedDurationMs: 10 * 60 * 1000,
    interruptionCount: 1,
    appSwitchCount: 1,
    idleTimeMs: 30 * 1000,
    scrollNoiseScore: 0.1,
    taskContinuityScore: 0.9,
    interactionCoherenceScore: 0.85,
    attentionStabilityScore: 0.9,
    deviceIntegrityScore: 0.9,
    sessionContinuityScore: 0.9,
    botSignalScore: 0.03,
    automationRisk: 0.02,
    duplicateSessionRisk: 0.02,
    ageBand: "18_plus",
    metadata: {},
    ...overrides
  };
}

describe("focus-engine", () => {
  it("verifies clean learning focus", () => {
    const result = verifyFocusSession(makeInput());

    expect(result.status).toBe("verified");
    expect(result.focusDepthScore).toBeGreaterThan(0.8);
    expect(result.focusQualityScore).toBeGreaterThan(0.7);
    expect(result.distractionScore).toBeLessThan(0.25);
    expect(result.riskScore).toBeLessThan(0.2);
    expect(result.focusMultiplier).toBeGreaterThanOrEqual(1);
    expect(result.fCoinEvent).toBeTruthy();
  });

  it("marks short focus as weak or incomplete", () => {
    const result = verifyFocusSession(
      makeInput({
        focusedDurationMs: 2 * 60 * 1000,
        intendedDurationMs: 10 * 60 * 1000
      })
    );

    expect(["weak", "incomplete"]).toContain(result.status);
    expect(result.reasons).toContain("focused_duration_below_minimum");
  });

  it("marks too many interruptions as distracted", () => {
    const result = verifyFocusSession(
      makeInput({
        interruptionCount: 12
      })
    );

    expect(result.status).toBe("distracted");
    expect(result.reasons).toContain("interruption_count_above_maximum");
  });

  it("marks too many app switches as distracted", () => {
    const result = verifyFocusSession(
      makeInput({
        appSwitchCount: 12
      })
    );

    expect(result.status).toBe("distracted");
    expect(result.reasons).toContain("app_switch_count_above_maximum");
  });

  it("marks high idle ratio as distracted", () => {
    const result = verifyFocusSession(
      makeInput({
        idleTimeMs: 5 * 60 * 1000
      })
    );

    expect(result.status).toBe("distracted");
    expect(result.reasons).toContain("idle_ratio_above_maximum");
  });

  it("marks low task continuity as weak", () => {
    const result = verifyFocusSession(
      makeInput({
        taskContinuityScore: 0.2
      })
    );

    expect(result.status).toBe("weak");
    expect(result.reasons).toContain("task_continuity_below_minimum");
  });

  it("marks low device integrity as suspicious", () => {
    const result = verifyFocusSession(
      makeInput({
        deviceIntegrityScore: 0.1
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("device_integrity_below_minimum");
  });

  it("marks high automation risk as suspicious or weak", () => {
    const result = verifyFocusSession(
      makeInput({
        botSignalScore: 1,
        automationRisk: 1,
        duplicateSessionRisk: 1
      })
    );

    expect(["suspicious", "weak"]).toContain(result.status);
    expect(result.reasons).toContain("risk_score_above_maximum");
  });

  it("blocks under 13 work focus as suspicious", () => {
    const result = verifyFocusSession(
      makeInput({
        purpose: "work",
        ageBand: "under_13",
        focusedDurationMs: 12 * 60 * 1000,
        intendedDurationMs: 12 * 60 * 1000
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_not_allowed_for_focus_purpose");
  });
});
