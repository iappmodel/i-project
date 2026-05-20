import {
  POPS_INTENT_ACTION_TYPE,
  POPS_INTENT_REASON_CODE,
  type PopsIntentActionType,
  type PopsIntentAssessment,
  type PopsIntentEvaluationContext,
  type PopsIntentReasonCode,
  type PopsIntentSignal
} from "./pops-intent.types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(6))));
}

function scoreFromDuration(valueMs: number, minMs: number, fullMs: number): number {
  if (valueMs <= minMs) return 0;
  if (valueMs >= fullMs) return 1;
  return clamp01((valueMs - minMs) / (fullMs - minMs));
}

function scoreBand(
  value: number,
  lowThreshold: number,
  highThreshold: number
): PopsIntentReasonCode {
  if (value >= highThreshold) return POPS_INTENT_REASON_CODE.HIGH_INTENT_CONFIDENCE;
  if (value >= lowThreshold) return POPS_INTENT_REASON_CODE.MEDIUM_INTENT_CONFIDENCE;
  return POPS_INTENT_REASON_CODE.LOW_INTENT_CONFIDENCE;
}

function scoreActionSequence(signal: PopsIntentSignal): number {
  return clamp01((signal.hesitationScore + (1 - signal.backtrackScore)) / 2);
}

function computeIntentConfidence(signal: PopsIntentSignal): number {
  const dwellScore = scoreFromDuration(signal.dwellBeforeActionMs, 250, 3500);
  const timingNaturalness = clamp01((signal.tapTimingScore + signal.touchRhythmScore) / 2);
  const actionSequence = scoreActionSequence(signal);

  const confidence =
    dwellScore +
    clamp01(signal.tapPrecisionScore) +
    timingNaturalness +
    clamp01(signal.contextMatchScore) +
    actionSequence -
    clamp01(signal.accidentalActionRisk) -
    clamp01(signal.rageTapScore) -
    clamp01(signal.automationRisk) -
    clamp01(signal.repeatActionScore);

  return clamp01(confidence / 5);
}

function applyBaseReasonCodes(signal: PopsIntentSignal, reasonCodes: PopsIntentReasonCode[]): void {
  if (signal.dwellBeforeActionMs >= 1000) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.VALID_AFTER_DWELL);
  }

  if (signal.contextMatchScore >= 0.6) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.VALID_CONTEXT_MATCH);
  } else {
    reasonCodes.push(POPS_INTENT_REASON_CODE.LOW_CONTEXT_MATCH);
  }

  if (signal.accidentalActionRisk >= 0.55) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.ACCIDENTAL_TAP_RISK);
  }
  if (signal.rageTapScore >= 0.55) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.RAGE_TAP_PATTERN);
  }
  if (signal.repeatActionScore >= 0.55) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.DUPLICATE_ACTION_PATTERN);
  }
  if (signal.automationRisk >= 0.55) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.AUTOMATION_TIMING_PATTERN);
  }
}

function validateActionRules(
  signal: PopsIntentSignal,
  context: PopsIntentEvaluationContext,
  reasonCodes: PopsIntentReasonCode[]
): boolean {
  const priorExposureMs = context.priorExposureMs ?? 0;
  const active = context.isActiveSession;

  if (!active) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.ACTION_TOO_FAST);
    return false;
  }

  switch (signal.actionType) {
    case POPS_INTENT_ACTION_TYPE.CTA_CLICK: {
      const hasMeaningfulExposure = signal.contentExposureMs >= 1500 || priorExposureMs >= 2500;
      const notInstant = signal.dwellBeforeActionMs >= 150 || priorExposureMs >= 3000;
      const noSpam = signal.repeatActionScore < 0.7;
      if (!hasMeaningfulExposure || !notInstant || !noSpam) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.ACTION_TOO_FAST);
        return false;
      }
      return true;
    }
    case POPS_INTENT_ACTION_TYPE.FOLLOW_CREATOR: {
      const hasExposure = signal.contentExposureMs >= 4000 || Boolean(context.seenProfileView);
      const noFarmPattern = signal.dwellBeforeActionMs >= 450 && signal.repeatActionScore < 0.65;
      if (!hasExposure || !noFarmPattern) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.ACTION_TOO_FAST);
        return false;
      }
      return true;
    }
    case POPS_INTENT_ACTION_TYPE.SAVE_CONTENT: {
      const meaningfulSave =
        signal.dwellBeforeActionMs >= 700 ||
        (context.replayCount ?? 0) > 0 ||
        (context.scrollPauseCount ?? 0) > 0;
      const noMassSave = signal.repeatActionScore < 0.7;
      if (!meaningfulSave || !noMassSave) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.DUPLICATE_ACTION_PATTERN);
        return false;
      }
      return true;
    }
    case POPS_INTENT_ACTION_TYPE.SURVEY_ANSWER: {
      const readMs = context.surveyQuestionReadMs ?? signal.contentExposureMs;
      const expectedRead = context.surveyExpectedReadMs ?? 1200;
      const noImpossibleSpeed = readMs >= expectedRead;
      const noChoicePattern = (context.sameChoiceStreak ?? 0) < 6;
      if (!noImpossibleSpeed) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.ACTION_TOO_FAST);
        return false;
      }
      if (!noChoicePattern) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.DUPLICATE_ACTION_PATTERN);
        return false;
      }
      return true;
    }
    case POPS_INTENT_ACTION_TYPE.TIP_SEND: {
      const confirmed = Boolean(context.walletConfirmed) && Boolean(context.explicitUserConfirmation);
      if (!confirmed) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.LOW_INTENT_CONFIDENCE);
        return false;
      }
      return true;
    }
    case POPS_INTENT_ACTION_TYPE.WALLET_CONVERT: {
      const confirmed = Boolean(context.explicitUserConfirmation);
      const continuity = Boolean(context.sessionContinuityOk);
      const deviceTrusted = (context.deviceTrustScore ?? 0.5) >= 0.6;
      if (!confirmed || !continuity || !deviceTrusted) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.LOW_INTENT_CONFIDENCE);
        return false;
      }
      return true;
    }
    case POPS_INTENT_ACTION_TYPE.WITHDRAW_REQUEST: {
      const continuity = Boolean(context.identityContinuityOk);
      if (!continuity) {
        reasonCodes.push(POPS_INTENT_REASON_CODE.LOW_INTENT_CONFIDENCE);
        return false;
      }
      return true;
    }
    default:
      return true;
  }
}

export function evaluatePopsIntentSignal(
  signal: PopsIntentSignal,
  context: PopsIntentEvaluationContext
): PopsIntentAssessment {
  const reasonCodes: PopsIntentReasonCode[] = [];
  applyBaseReasonCodes(signal, reasonCodes);

  const computedIntentConfidence = computeIntentConfidence(signal);
  const ruleValid = validateActionRules(signal, context, reasonCodes);
  const minRequired =
    signal.actionType === POPS_INTENT_ACTION_TYPE.TIP_SEND ||
    signal.actionType === POPS_INTENT_ACTION_TYPE.WALLET_CONVERT ||
    signal.actionType === POPS_INTENT_ACTION_TYPE.WITHDRAW_REQUEST
      ? 0.7
      : 0.45;

  const finalConfidence = clamp01((computedIntentConfidence + signal.intentConfidence) / 2);
  const confidenceBand = scoreBand(finalConfidence, 0.45, 0.75);
  reasonCodes.push(confidenceBand);

  const isDeliberate = ruleValid && finalConfidence >= minRequired;
  if (isDeliberate) {
    reasonCodes.push(POPS_INTENT_REASON_CODE.VALID_DELIBERATE_ACTION);
  }

  return {
    signal: {
      ...signal,
      intentConfidence: finalConfidence
    },
    intentConfidence: finalConfidence,
    isDeliberate,
    reasonCodes
  };
}

export function defaultIntentSignal(actionType: PopsIntentActionType): PopsIntentSignal {
  return {
    actionType,
    timestampMs: Date.now(),
    contentExposureMs: 0,
    dwellBeforeActionMs: 0,
    tapPrecisionScore: 0,
    tapTimingScore: 0,
    touchRhythmScore: 0,
    hesitationScore: 0,
    rageTapScore: 0,
    backtrackScore: 0,
    repeatActionScore: 0,
    contextMatchScore: 0,
    accidentalActionRisk: 0,
    automationRisk: 0,
    intentConfidence: 0
  };
}
