import { beforeEach, describe, expect, it } from "vitest";
import {
  completeFocusSession,
  getFocusSession,
  getFocusVerificationResult,
  resetFocusSessionStoreForTests,
  startFocusSession,
  updateFocusSessionProgress,
  verifyStoredFocusSession
} from "../focus-session-store";

describe("focus-session-store", () => {
  beforeEach(() => {
    resetFocusSessionStoreForTests();
  });

  it("starts focus session", () => {
    const session = startFocusSession({
      userId: crypto.randomUUID(),
      purpose: "learning",
      intendedDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    expect(session.status).toBe("started");
    expect(session.focusedDurationMs).toBe(0);

    const stored = getFocusSession(session.focusSessionId);
    expect(stored?.focusSessionId).toBe(session.focusSessionId);
  });

  it("updates focus progress", () => {
    const session = startFocusSession({
      userId: crypto.randomUUID(),
      purpose: "learning",
      intendedDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    const updated = updateFocusSessionProgress({
      focusSessionId: session.focusSessionId,
      focusedDurationMs: 5 * 60 * 1000
    });

    expect(updated.focusedDurationMs).toBe(5 * 60 * 1000);
  });

  it("prevents focus duration moving backwards", () => {
    const session = startFocusSession({
      userId: crypto.randomUUID(),
      purpose: "learning",
      intendedDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    updateFocusSessionProgress({
      focusSessionId: session.focusSessionId,
      focusedDurationMs: 5 * 60 * 1000
    });

    expect(() =>
      updateFocusSessionProgress({
        focusSessionId: session.focusSessionId,
        focusedDurationMs: 60 * 1000
      })
    ).toThrow();
  });

  it("completes focus session", () => {
    const session = startFocusSession({
      userId: crypto.randomUUID(),
      purpose: "learning",
      intendedDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    const completed = completeFocusSession(session.focusSessionId);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
  });

  it("verifies stored focus session", () => {
    const session = startFocusSession({
      userId: crypto.randomUUID(),
      purpose: "learning",
      intendedDurationMs: 10 * 60 * 1000,
      ageBand: "18_plus"
    });

    updateFocusSessionProgress({
      focusSessionId: session.focusSessionId,
      focusedDurationMs: 10 * 60 * 1000
    });

    completeFocusSession(session.focusSessionId);

    const result = verifyStoredFocusSession({
      focusSessionId: session.focusSessionId,
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
      duplicateSessionRisk: 0.02
    });

    expect(result.status).toBe("verified");

    const stored = getFocusVerificationResult(session.focusSessionId);
    expect(stored?.status).toBe("verified");
  });
});
