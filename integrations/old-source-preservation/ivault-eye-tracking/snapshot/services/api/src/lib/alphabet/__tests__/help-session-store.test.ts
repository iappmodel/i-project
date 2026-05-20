import { beforeEach, describe, expect, it } from "vitest";
import {
  completeHelpSession,
  getHelpSession,
  getHelpVerificationResult,
  resetHelpSessionStoreForTests,
  startHelpSession,
  updateHelpSessionDuration,
  verifyStoredHelpSession
} from "../help-session-store";

describe("help-session-store", () => {
  beforeEach(() => {
    resetHelpSessionStoreForTests();
  });

  it("starts help session", () => {
    const session = startHelpSession({
      helperUserId: crypto.randomUUID(),
      recipientUserId: crypto.randomUUID(),
      context: "learning_help",
      helperAgeBand: "18_plus",
      recipientAgeBand: "18_plus"
    });

    expect(session.status).toBe("started");
    expect(session.durationMs).toBe(0);

    const stored = getHelpSession(session.helpSessionId);
    expect(stored?.helpSessionId).toBe(session.helpSessionId);
  });

  it("prevents same helper and recipient", () => {
    const userId = crypto.randomUUID();

    expect(() =>
      startHelpSession({
        helperUserId: userId,
        recipientUserId: userId,
        context: "learning_help",
        helperAgeBand: "18_plus",
        recipientAgeBand: "18_plus"
      })
    ).toThrow();
  });

  it("updates duration", () => {
    const session = startHelpSession({
      helperUserId: crypto.randomUUID(),
      recipientUserId: crypto.randomUUID(),
      context: "learning_help",
      helperAgeBand: "18_plus",
      recipientAgeBand: "18_plus"
    });

    const updated = updateHelpSessionDuration({
      helpSessionId: session.helpSessionId,
      durationMs: 10 * 60 * 1000
    });

    expect(updated.durationMs).toBe(10 * 60 * 1000);
  });

  it("prevents duration moving backwards", () => {
    const session = startHelpSession({
      helperUserId: crypto.randomUUID(),
      recipientUserId: crypto.randomUUID(),
      context: "learning_help",
      helperAgeBand: "18_plus",
      recipientAgeBand: "18_plus"
    });

    updateHelpSessionDuration({
      helpSessionId: session.helpSessionId,
      durationMs: 10 * 60 * 1000
    });

    expect(() =>
      updateHelpSessionDuration({
        helpSessionId: session.helpSessionId,
        durationMs: 1
      })
    ).toThrow();
  });

  it("completes help session", () => {
    const session = startHelpSession({
      helperUserId: crypto.randomUUID(),
      recipientUserId: crypto.randomUUID(),
      context: "learning_help",
      helperAgeBand: "18_plus",
      recipientAgeBand: "18_plus"
    });

    const completed = completeHelpSession(session.helpSessionId);

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
  });

  it("verifies stored help session", () => {
    const session = startHelpSession({
      helperUserId: crypto.randomUUID(),
      recipientUserId: crypto.randomUUID(),
      context: "learning_help",
      helperAgeBand: "18_plus",
      recipientAgeBand: "18_plus"
    });

    updateHelpSessionDuration({
      helpSessionId: session.helpSessionId,
      durationMs: 10 * 60 * 1000
    });

    completeHelpSession(session.helpSessionId);

    const result = verifyStoredHelpSession({
      helpSessionId: session.helpSessionId,
      recipientConfirmed: true,
      recipientUsefulnessScore: 0.85,
      recipientOutcomeScore: 0.8,
      helperEffortScore: 0.82,
      kindnessScore: 0.9,
      clarityScore: 0.86,
      followThroughScore: 0.8,
      repeatHelpScore: 0.4,
      impactScore: 0.75,
      vulnerabilityLevel: 0.3,
      sensitivityLevel: 0.2,
      independentOutcomeEvidenceScore: 0.72,
      communityValidationScore: 0.5,
      systemValidationScore: 0.75,
      collusionRisk: 0.03,
      manipulationRisk: 0.03,
      harassmentRisk: 0.02,
      fakeRecipientRisk: 0.02,
      paymentCoercionRisk: 0.01,
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("help_verified");

    const stored = getHelpVerificationResult(session.helpSessionId);
    expect(stored?.status).toBe("help_verified");
  });
});
