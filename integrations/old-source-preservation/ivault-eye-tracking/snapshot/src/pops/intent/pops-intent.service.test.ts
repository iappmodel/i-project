import { describe, expect, it } from "vitest";
import { PopsIntentService, createIntentSignal } from "./pops-intent.service";
import { POPS_INTENT_ACTION_TYPE } from "./pops-intent.types";

describe("PopsIntentService", () => {
  const service = new PopsIntentService();

  it("scores CTA click as deliberate after meaningful dwell", () => {
    const assessment = service.evaluate(
      createIntentSignal({
        actionType: POPS_INTENT_ACTION_TYPE.CTA_CLICK,
        contentExposureMs: 5000,
        dwellBeforeActionMs: 1400,
        tapPrecisionScore: 0.88,
        tapTimingScore: 0.82,
        touchRhythmScore: 0.79,
        hesitationScore: 0.7,
        rageTapScore: 0.1,
        backtrackScore: 0.1,
        repeatActionScore: 0.1,
        contextMatchScore: 0.9,
        accidentalActionRisk: 0.1,
        automationRisk: 0.05
      }),
      { isActiveSession: true }
    );

    expect(assessment.isDeliberate).toBe(true);
    expect(assessment.intentConfidence).toBeGreaterThan(0.6);
    expect(assessment.reasonCodes).toContain("VALID_DELIBERATE_ACTION");
  });

  it("flags survey answers that are too fast", () => {
    const assessment = service.evaluate(
      createIntentSignal({
        actionType: POPS_INTENT_ACTION_TYPE.SURVEY_ANSWER,
        contentExposureMs: 300,
        dwellBeforeActionMs: 120,
        tapPrecisionScore: 0.6,
        tapTimingScore: 0.6,
        touchRhythmScore: 0.5,
        hesitationScore: 0.4,
        rageTapScore: 0.2,
        backtrackScore: 0.4,
        repeatActionScore: 0.3,
        contextMatchScore: 0.5,
        accidentalActionRisk: 0.4,
        automationRisk: 0.1
      }),
      {
        isActiveSession: true,
        surveyQuestionReadMs: 400,
        surveyExpectedReadMs: 1800,
        sameChoiceStreak: 2
      }
    );

    expect(assessment.isDeliberate).toBe(false);
    expect(assessment.reasonCodes).toContain("ACTION_TOO_FAST");
  });

  it("requires confirmations for wallet convert intent", () => {
    const signal = createIntentSignal({
      actionType: POPS_INTENT_ACTION_TYPE.WALLET_CONVERT,
      contentExposureMs: 6000,
      dwellBeforeActionMs: 1000,
      tapPrecisionScore: 0.9,
      tapTimingScore: 0.85,
      touchRhythmScore: 0.8,
      hesitationScore: 0.65,
      rageTapScore: 0.1,
      backtrackScore: 0.1,
      repeatActionScore: 0.1,
      contextMatchScore: 0.95,
      accidentalActionRisk: 0.1,
      automationRisk: 0.1
    });

    const denied = service.evaluate(signal, {
      isActiveSession: true,
      explicitUserConfirmation: false,
      sessionContinuityOk: true,
      deviceTrustScore: 0.95
    });
    expect(denied.isDeliberate).toBe(false);

    const allowed = service.evaluate(signal, {
      isActiveSession: true,
      explicitUserConfirmation: true,
      sessionContinuityOk: true,
      deviceTrustScore: 0.95
    });
    expect(allowed.isDeliberate).toBe(true);
  });
});
