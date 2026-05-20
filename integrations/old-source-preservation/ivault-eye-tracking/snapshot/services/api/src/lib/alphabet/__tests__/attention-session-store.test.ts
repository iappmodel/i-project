import { beforeEach, describe, expect, it } from "vitest";
import {
  completeAttentionSession,
  getAttentionSession,
  getAttentionVerificationResult,
  resetAttentionSessionStoreForTests,
  startAttentionSession,
  updateAttentionSessionProgress,
  verifyStoredAttentionSession
} from "../attention-session-store";

describe("attention-session-store", () => {
  beforeEach(() => {
    resetAttentionSessionStoreForTests();
  });

  it("starts attention session", () => {
    const session = startAttentionSession({
      userId: crypto.randomUUID(),
      context: "campaign",
      objectType: "campaign",
      objectId: crypto.randomUUID(),
      requiredDurationMs: 30000,
      ageBand: "18_plus"
    });

    expect(session.status).toBe("started");
    expect(session.watchedDurationMs).toBe(0);

    const stored = getAttentionSession(session.attentionSessionId);
    expect(stored?.attentionSessionId).toBe(session.attentionSessionId);
  });

  it("updates progress", () => {
    const session = startAttentionSession({
      userId: crypto.randomUUID(),
      context: "campaign",
      objectType: "campaign",
      objectId: crypto.randomUUID(),
      requiredDurationMs: 30000,
      ageBand: "18_plus"
    });

    const updated = updateAttentionSessionProgress({
      attentionSessionId: session.attentionSessionId,
      watchedDurationMs: 15000
    });

    expect(updated.watchedDurationMs).toBe(15000);
  });

  it("prevents watched duration moving backwards", () => {
    const session = startAttentionSession({
      userId: crypto.randomUUID(),
      context: "campaign",
      objectType: "campaign",
      objectId: crypto.randomUUID(),
      requiredDurationMs: 30000,
      ageBand: "18_plus"
    });

    updateAttentionSessionProgress({
      attentionSessionId: session.attentionSessionId,
      watchedDurationMs: 15000
    });

    expect(() =>
      updateAttentionSessionProgress({
        attentionSessionId: session.attentionSessionId,
        watchedDurationMs: 10000
      })
    ).toThrow();
  });

  it("completes session", () => {
    const session = startAttentionSession({
      userId: crypto.randomUUID(),
      context: "campaign",
      objectType: "campaign",
      objectId: crypto.randomUUID(),
      requiredDurationMs: 30000,
      ageBand: "18_plus"
    });

    const completed = completeAttentionSession(session.attentionSessionId);

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
  });

  it("verifies stored session", () => {
    const session = startAttentionSession({
      userId: crypto.randomUUID(),
      context: "campaign",
      objectType: "campaign",
      objectId: crypto.randomUUID(),
      requiredDurationMs: 30000,
      ageBand: "18_plus"
    });

    updateAttentionSessionProgress({
      attentionSessionId: session.attentionSessionId,
      watchedDurationMs: 30000
    });

    completeAttentionSession(session.attentionSessionId);

    const result = verifyStoredAttentionSession({
      attentionSessionId: session.attentionSessionId,

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
      emulatorRisk: 0.05
    });

    expect(result.status).toBe("verified");

    const storedResult = getAttentionVerificationResult(session.attentionSessionId);
    expect(storedResult?.status).toBe("verified");
  });
});
