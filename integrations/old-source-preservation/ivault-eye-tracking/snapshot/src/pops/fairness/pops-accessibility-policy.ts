import type { PopsJudgment } from "../../../services/api/src/pops/types/pops-decisions.types";
import { POPS_REASON_CODES } from "../scoring/pops-reason-code-engine";
import { POPS_ACCESSIBILITY_MODE, type PopsAccessibilityMode } from "./pops-fairness.types";

/**
 * P.O.P.S validates humane presence, not normative behavior.
 * These rules are product policy — not clinical labels.
 */
export const POPS_ACCESSIBILITY_POLICY = {
  visual: {
    doNotRequireConstantGaze: true,
    doNotPenalizeBlinking: true,
    doNotPenalizeBriefLookAway: true,
    doNotInferAbsenceFromAtypicalEyeMovement: true,
    visualPresenceNotMandatoryForBasicEarning: true,
    alternateProofWhenPossible: true
  },
  touch: {
    doNotAssumeUniformTapScrollRhythm: true,
    assistiveInputMayAlterTiming: true,
    unusualTimingNotFraudWithoutCorroboration: true
  },
  motion: {
    lowMotionNotAutomaticallyFraud: true,
    mountedOrAdaptiveHardwareExpected: true
  },
  audio: {
    hearingOrSpeechDifferenceMustNotReduceEligibility: true,
    audioNeverRequiredForBasicRewardUnlessActionIsAudioBased: true
  },
  device: {
    lowSensorQualityDegradesConfidenceNotSoleFraudTrigger: true
  },
  environment: {
    poorConditionsTriggerFallbackNotAutoDenial: true
  },
  ageAware: {
    avoidAdultNormalizedThresholdsForMinorsAndElderly: true
  }
} as const;

/** Reason codes or substrings that indicate hard fraud — fairness must not bypass these. */
export const POPS_HARD_FRAUD_REASON_CODES: readonly string[] = [
  POPS_REASON_CODES.negative.IMPOSSIBLE_COMPLETION_SPEED,
  POPS_REASON_CODES.negative.DUPLICATE_REWARD_ATTEMPT,
  POPS_REASON_CODES.negative.CAMPAIGN_ABUSE_PATTERN,
  "FORGED_EVENTS_DETECTED",
  "SESSION_REPLAY_DETECTED",
  "SEVERE_DEVICE_INTEGRITY",
  "DEVICE_INTEGRITY_CRITICAL",
  "AUTOMATION_PATTERN_CONFIRMED"
] as const;

export function judgmentIndicatesHardFraud(judgment: PopsJudgment): boolean {
  const codes = new Set(judgment.reasonCodes);
  for (const hard of POPS_HARD_FRAUD_REASON_CODES) {
    if (codes.has(hard)) {
      return true;
    }
  }
  for (const code of judgment.reasonCodes) {
    if (code.includes("REPLAY") && code.includes("SESSION")) {
      return true;
    }
    if (code.includes("FORGED")) {
      return true;
    }
    if (code === "AUTOMATION_PATTERN_CONFIRMED") {
      return true;
    }
  }
  return false;
}

export function hasActiveAccessibilityModes(modes: PopsAccessibilityMode[]): boolean {
  return modes.some((m) => m !== POPS_ACCESSIBILITY_MODE.NONE);
}
