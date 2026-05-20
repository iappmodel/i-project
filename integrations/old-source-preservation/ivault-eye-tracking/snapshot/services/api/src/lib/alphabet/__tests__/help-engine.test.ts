import { describe, expect, it } from "vitest";
import type { HelpSignalInput } from "../../../types/alphabet/help.types";
import { verifyHelpSession } from "../help-engine";

function makeInput(overrides: Partial<HelpSignalInput> = {}): HelpSignalInput {
  return {
    helpSessionId: crypto.randomUUID(),
    helperUserId: crypto.randomUUID(),
    recipientUserId: crypto.randomUUID(),
    context: "learning_help",
    durationMs: 10 * 60 * 1000,
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
    deviceIntegrityScore: 0.9,
    helperAgeBand: "18_plus",
    recipientAgeBand: "18_plus",
    metadata: {},
    ...overrides
  };
}

describe("help-engine", () => {
  it("verifies normal helpful action", () => {
    const result = verifyHelpSession(makeInput());

    expect(result.status).toBe("help_verified");
    expect(result.helpScore).toBeGreaterThan(0.6);
    expect(result.outcomeScore).toBeGreaterThan(0.55);
    expect(result.hCoinEvent?.eventType).toBe("help_verified");
    expect(result.nCoinEvent).toBeNull();
  });

  it("verifies noble action when impact and evidence are rare", () => {
    const result = verifyHelpSession(
      makeInput({
        context: "technical_help",
        recipientUsefulnessScore: 0.95,
        recipientOutcomeScore: 0.95,
        helperEffortScore: 0.95,
        kindnessScore: 0.98,
        clarityScore: 0.95,
        followThroughScore: 0.97,
        impactScore: 0.95,
        vulnerabilityLevel: 0.8,
        sensitivityLevel: 0.6,
        independentOutcomeEvidenceScore: 0.9,
        systemValidationScore: 0.9,
        communityValidationScore: 0.85,
        collusionRisk: 0.01,
        fakeRecipientRisk: 0.01,
        harassmentRisk: 0.01
      })
    );

    expect(result.status).toBe("noble_action_verified");
    expect(result.hCoinEvent?.eventType).toBe("help_verified");
    expect(result.nCoinEvent?.eventType).toBe("noble_action_verified");
  });

  it("rejects same helper and recipient", () => {
    const userId = crypto.randomUUID();

    const result = verifyHelpSession(
      makeInput({
        helperUserId: userId,
        recipientUserId: userId
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("helper_and_recipient_same_user");
  });

  it("requires recipient confirmation when rule requires it", () => {
    const result = verifyHelpSession(
      makeInput({
        recipientConfirmed: false,
        independentOutcomeEvidenceScore: 0.3
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("recipient_confirmation_required");
  });

  it("flags collusion as suspicious", () => {
    const result = verifyHelpSession(
      makeInput({
        collusionRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("collusion_risk_above_maximum");
  });

  it("flags fake recipient as suspicious", () => {
    const result = verifyHelpSession(
      makeInput({
        fakeRecipientRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("fake_recipient_risk_above_maximum");
  });

  it("flags harassment as suspicious", () => {
    const result = verifyHelpSession(
      makeInput({
        harassmentRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("harassment_risk_above_maximum");
  });

  it("blocks under 13 emotional support helper", () => {
    const result = verifyHelpSession(
      makeInput({
        context: "emotional_support",
        helperAgeBand: "under_13"
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_helper_not_allowed_for_context");
  });

  it("requires review for sensitive emotional support", () => {
    const result = verifyHelpSession(
      makeInput({
        context: "emotional_support",
        vulnerabilityLevel: 0.9,
        sensitivityLevel: 0.9
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("sensitive_help_requires_review");
  });
});
