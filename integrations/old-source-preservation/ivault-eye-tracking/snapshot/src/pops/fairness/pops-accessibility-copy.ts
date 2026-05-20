import { POPS_FAIRNESS_REASON_CODE, type PopsFairnessReasonCode } from "./pops-fairness.types";

/** User-safe strings — no disability inference or protected-class language. */
export const POPS_ACCESSIBILITY_COPY = {
  fairnessAdjusted:
    "P.O.P.S adjusted verification for your device and accessibility context.",
  alternateAvailable: "Alternative verification is available for this moment.",
  saferPathSignalsUnavailable:
    "Some signals were unavailable, so P.O.P.S used a safer verification path."
} as const;

export function popsAccessibilityMessageForReasons(codes: PopsFairnessReasonCode[]): string {
  if (codes.length === 0) {
    return "";
  }
  if (codes.includes(POPS_FAIRNESS_REASON_CODE.ACCESSIBILITY_SAFE_MODE_APPLIED)) {
    return POPS_ACCESSIBILITY_COPY.fairnessAdjusted;
  }
  if (
    codes.includes(POPS_FAIRNESS_REASON_CODE.OPTIONAL_VISUAL_WEIGHT_REMOVED) ||
    codes.includes(POPS_FAIRNESS_REASON_CODE.SENSOR_QUALITY_DEGRADED_NOT_FRAUD)
  ) {
    return POPS_ACCESSIBILITY_COPY.saferPathSignalsUnavailable;
  }
  if (
    codes.includes(POPS_FAIRNESS_REASON_CODE.MANUAL_CONFIRMATION_ALLOWED) ||
    codes.includes(POPS_FAIRNESS_REASON_CODE.REVIEW_USED_INSTEAD_OF_DENIAL)
  ) {
    return POPS_ACCESSIBILITY_COPY.alternateAvailable;
  }
  return POPS_ACCESSIBILITY_COPY.fairnessAdjusted;
}
