import {
  POPS_RECOMMENDED_ACTION,
  POPS_REWARD_ELIGIBILITY,
  type PopsJudgment
} from "../../../services/api/src/pops/types/pops-decisions.types";
import { POPS_MANUAL_REVIEW_POLICY } from "../campaigns/pops-campaign-requirements.types";
import { judgmentIndicatesHardFraud } from "./pops-accessibility-policy";
import { assessFairnessRisks } from "./pops-bias-risk-checker";
import {
  POPS_ACCESSIBILITY_MODE,
  POPS_FAIRNESS_ADJUSTMENT_TYPE,
  POPS_FAIRNESS_REASON_CODE,
  POPS_FAIRNESS_RISK,
  type ApplyFairnessAdjustmentsInput,
  type ApplyFairnessAdjustmentsResult,
  type PopsFairnessAdjustment,
  type PopsFairnessReasonCode
} from "./pops-fairness.types";

function cloneJudgment(j: PopsJudgment): PopsJudgment {
  return {
    ...j,
    reasonCodes: [...j.reasonCodes]
  };
}

function newId(): string {
  return `pops_fair_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Applies accessibility-safe fairness adjustments to a judgment.
 * Never weakens outcomes when {@link judgmentIndicatesHardFraud} is true.
 */
export function applyFairnessAdjustments(input: ApplyFairnessAdjustmentsInput): ApplyFairnessAdjustmentsResult {
  const { session, signalAvailability, accessibilityContext, campaignRequirements, judgment } = input;
  const applied: PopsFairnessAdjustment[] = [];
  const fairnessReasonCodes: PopsFairnessReasonCode[] = [];

  const adjustedJudgment = cloneJudgment(judgment);

  if (judgmentIndicatesHardFraud(judgment)) {
    return { adjustedJudgment, appliedAdjustments: applied, fairnessReasonCodes };
  }

  const risks = assessFairnessRisks({
    session,
    signalAvailability,
    accessibilityContext,
    campaignRequirements
  });

  const modes = new Set(accessibilityContext.modes);
  const accessibilityActive =
    modes.size > 0 && !(modes.size === 1 && modes.has(POPS_ACCESSIBILITY_MODE.NONE));
  const safeMode =
    accessibilityActive ||
    signalAvailability.visual === "degraded" ||
    signalAvailability.visual === "unavailable" ||
    signalAvailability.deviceSensorQuality === "low" ||
    signalAvailability.environmentStress === "high" ||
    signalAvailability.networkQuality === "low";

  if (safeMode) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.ACCESSIBILITY_CONFLICT_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.APPLY_ACCESSIBILITY_SAFE_MODE,
      originalRequirement: "default_verification_path",
      adjustedRequirement: "accessibility_safe_verification_path",
      reason: "Activated safer verification path for reported context and signal availability."
    });
    fairnessReasonCodes.push(POPS_FAIRNESS_REASON_CODE.ACCESSIBILITY_SAFE_MODE_APPLIED);
  }

  if (signalAvailability.visual !== "available" || risks.includes(POPS_FAIRNESS_RISK.VISUAL_DEPENDENCY_RISK)) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.VISUAL_DEPENDENCY_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.LOWER_OPTIONAL_SIGNAL_WEIGHT,
      originalRequirement: "visual_weight_default",
      adjustedRequirement: "visual_optional_or_redistributed",
      reason: "Visual signal degraded or accessibility prefers non-visual path."
    });
    fairnessReasonCodes.push(POPS_FAIRNESS_REASON_CODE.OPTIONAL_VISUAL_WEIGHT_REMOVED);
    adjustedJudgment.presenceConfidence = bump(adjustedJudgment.presenceConfidence, 0.04);
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.VISUAL_DEPENDENCY_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.REDISTRIBUTE_SIGNAL_WEIGHTS,
      originalRequirement: "presence_attention_balance_default",
      adjustedRequirement: "presence_attention_rebalanced",
      reason: "Rebalanced weights when visual path is optional or degraded."
    });
  }

  if (risks.includes(POPS_FAIRNESS_RISK.TOUCH_PATTERN_BIAS_RISK)) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.TOUCH_PATTERN_BIAS_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.ALLOW_ALTERNATE_INTERACTION,
      originalRequirement: "touch_timing_normative",
      adjustedRequirement: "touch_timing_inclusive",
      reason: "Assistive or motor access may alter touch timing; not used alone for negative scoring."
    });
    fairnessReasonCodes.push(POPS_FAIRNESS_REASON_CODE.TOUCH_PATTERN_NOT_USED_FOR_NEGATIVE_SCORING);
    if (adjustedJudgment.fraudRisk > 0 && adjustedJudgment.fraudRisk < 0.85) {
      adjustedJudgment.fraudRisk = Math.max(0, adjustedJudgment.fraudRisk - 0.04);
    }
  }

  if (risks.includes(POPS_FAIRNESS_RISK.MOTION_PATTERN_BIAS_RISK)) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.MOTION_PATTERN_BIAS_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.LOWER_OPTIONAL_SIGNAL_WEIGHT,
      originalRequirement: "motion_stability_default",
      adjustedRequirement: "motion_optional_low_penalty",
      reason: "Low or static motion is compatible with mounted devices and reduced motion."
    });
    fairnessReasonCodes.push(POPS_FAIRNESS_REASON_CODE.LOW_MOTION_NOT_PENALIZED);
    adjustedJudgment.continuityConfidence = bump(adjustedJudgment.continuityConfidence, 0.03);
  }

  if (risks.includes(POPS_FAIRNESS_RISK.DEVICE_QUALITY_BIAS_RISK)) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.DEVICE_QUALITY_BIAS_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.USE_TRUST_BASED_FALLBACK,
      originalRequirement: "sensor_quality_strict",
      adjustedRequirement: "sensor_quality_confidence_only",
      reason: "Low sensor quality degrades confidence; not treated as standalone fraud."
    });
    fairnessReasonCodes.push(POPS_FAIRNESS_REASON_CODE.SENSOR_QUALITY_DEGRADED_NOT_FRAUD);
    if (adjustedJudgment.fraudRisk < 0.75) {
      adjustedJudgment.fraudRisk = Math.max(0, adjustedJudgment.fraudRisk - 0.03);
    }
  }

  if (
    modes.has(POPS_ACCESSIBILITY_MODE.MOTOR_ACCESSIBILITY) ||
    modes.has(POPS_ACCESSIBILITY_MODE.SWITCH_CONTROL) ||
    modes.has(POPS_ACCESSIBILITY_MODE.VOICE_CONTROL)
  ) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.TOUCH_PATTERN_BIAS_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.ALLOW_MANUAL_CONFIRMATION,
      originalRequirement: "interaction_auto_only",
      adjustedRequirement: "interaction_manual_confirm_allowed",
      reason: "Manual confirmation available when motor or voice access is in use."
    });
    fairnessReasonCodes.push(POPS_FAIRNESS_REASON_CODE.MANUAL_CONFIRMATION_ALLOWED);
  }

  const allowReviewInsteadOfDeny =
    (risks.length > 0 || accessibilityActive || safeMode) &&
    campaignRequirements.manualReviewPolicy !== POPS_MANUAL_REVIEW_POLICY.DISABLED;

  if (adjustedJudgment.rewardEligibility === POPS_REWARD_ELIGIBILITY.DENIED && allowReviewInsteadOfDeny) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.LIGHTING_ENVIRONMENT_BIAS_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.REQUIRE_REVIEW_INSTEAD_OF_DENIAL,
      originalRequirement: "auto_deny_on_low_confidence",
      adjustedRequirement: "hold_for_review_when_policy_allows",
      reason: "Environment or accessibility stress — review instead of automatic denial when policy permits."
    });
    adjustedJudgment.rewardEligibility = POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW;
    if (adjustedJudgment.recommendedAction === POPS_RECOMMENDED_ACTION.DENY_REWARD) {
      adjustedJudgment.recommendedAction = POPS_RECOMMENDED_ACTION.HOLD_REWARD;
    }
    fairnessReasonCodes.push(POPS_FAIRNESS_REASON_CODE.REVIEW_USED_INSTEAD_OF_DENIAL);
  }

  if (risks.includes(POPS_FAIRNESS_RISK.LIGHTING_ENVIRONMENT_BIAS_RISK) && signalAvailability.environmentStress === "high") {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.LIGHTING_ENVIRONMENT_BIAS_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.EXTEND_TIME_WINDOW,
      originalRequirement: `duration_${session.requiredDurationMs}`,
      adjustedRequirement: `duration_${Math.round(session.requiredDurationMs * 1.08)}_fairness_buffer`,
      reason: "High environmental stress — slight time buffer applied where policy allows."
    });
  }

  if (modes.has(POPS_ACCESSIBILITY_MODE.VISUAL_ACCESSIBILITY) && campaignRequirements.visualPresenceRequired === true) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.ACCESSIBILITY_CONFLICT_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.DISABLE_VISUAL_REQUIREMENT,
      originalRequirement: "visual_presence_required",
      adjustedRequirement: "visual_presence_relaxed_or_alternate",
      reason: "Visual requirement relaxed when alternate proof is permitted by campaign."
    });
  }

  if (modes.has(POPS_ACCESSIBILITY_MODE.HEARING_ACCESSIBILITY)) {
    pushAdjustment(applied, {
      sessionId: session.id,
      userId: session.userId,
      riskType: POPS_FAIRNESS_RISK.ACCESSIBILITY_CONFLICT_RISK,
      adjustmentType: POPS_FAIRNESS_ADJUSTMENT_TYPE.SKIP_BIOMETRIC_SIGNAL,
      originalRequirement: "audio_feature_gate",
      adjustedRequirement: "audio_feature_optional",
      reason: "Audio-derived features not used as a hard gate for this session."
    });
  }

  return {
    adjustedJudgment,
    appliedAdjustments: applied,
    fairnessReasonCodes: dedupeReasonCodes(fairnessReasonCodes)
  };
}

function dedupeReasonCodes(codes: PopsFairnessReasonCode[]): PopsFairnessReasonCode[] {
  return [...new Set(codes)];
}

function pushAdjustment(list: PopsFairnessAdjustment[], partial: Omit<PopsFairnessAdjustment, "id" | "createdAt">): void {
  list.push({
    ...partial,
    id: newId(),
    createdAt: nowIso()
  });
}

function bump(value: number, delta: number): number {
  return Math.min(1, Math.max(0, value + delta));
}

/**
 * Accessibility-safe scoring wrapper: runs fairness adjustments on an existing judgment.
 */
export function scoreWithAccessibilitySafeMode(input: ApplyFairnessAdjustmentsInput): ApplyFairnessAdjustmentsResult {
  return applyFairnessAdjustments(input);
}
