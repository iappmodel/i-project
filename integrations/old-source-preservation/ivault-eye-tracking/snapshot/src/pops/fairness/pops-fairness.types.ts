import type { PopsJudgment } from "../../../services/api/src/pops/types/pops-decisions.types";
import type { PopsSession } from "../../../services/api/src/pops/types/pops.types";
import type { PopsCampaignVerificationRequirement } from "../campaigns/pops-campaign-requirements.types";

export const POPS_ACCESSIBILITY_MODE = {
  NONE: "NONE",
  SCREEN_READER_ACTIVE: "SCREEN_READER_ACTIVE",
  REDUCED_MOTION: "REDUCED_MOTION",
  SWITCH_CONTROL: "SWITCH_CONTROL",
  VOICE_CONTROL: "VOICE_CONTROL",
  ASSISTIVE_TOUCH: "ASSISTIVE_TOUCH",
  MOTOR_ACCESSIBILITY: "MOTOR_ACCESSIBILITY",
  VISUAL_ACCESSIBILITY: "VISUAL_ACCESSIBILITY",
  HEARING_ACCESSIBILITY: "HEARING_ACCESSIBILITY",
  COGNITIVE_ACCESSIBILITY: "COGNITIVE_ACCESSIBILITY",
  UNKNOWN_ACCESSIBILITY_CONTEXT: "UNKNOWN_ACCESSIBILITY_CONTEXT"
} as const;

export type PopsAccessibilityMode =
  (typeof POPS_ACCESSIBILITY_MODE)[keyof typeof POPS_ACCESSIBILITY_MODE];

export const POPS_FAIRNESS_RISK = {
  VISUAL_DEPENDENCY_RISK: "VISUAL_DEPENDENCY_RISK",
  TOUCH_PATTERN_BIAS_RISK: "TOUCH_PATTERN_BIAS_RISK",
  MOTION_PATTERN_BIAS_RISK: "MOTION_PATTERN_BIAS_RISK",
  LIGHTING_ENVIRONMENT_BIAS_RISK: "LIGHTING_ENVIRONMENT_BIAS_RISK",
  DEVICE_QUALITY_BIAS_RISK: "DEVICE_QUALITY_BIAS_RISK",
  AGE_PATTERN_BIAS_RISK: "AGE_PATTERN_BIAS_RISK",
  NEURODIVERGENCE_PATTERN_RISK: "NEURODIVERGENCE_PATTERN_RISK",
  ACCESSIBILITY_CONFLICT_RISK: "ACCESSIBILITY_CONFLICT_RISK",
  REGION_DEVICE_INFRASTRUCTURE_RISK: "REGION_DEVICE_INFRASTRUCTURE_RISK"
} as const;

export type PopsFairnessRisk = (typeof POPS_FAIRNESS_RISK)[keyof typeof POPS_FAIRNESS_RISK];

export const POPS_FAIRNESS_ADJUSTMENT_TYPE = {
  REDISTRIBUTE_SIGNAL_WEIGHTS: "REDISTRIBUTE_SIGNAL_WEIGHTS",
  LOWER_OPTIONAL_SIGNAL_WEIGHT: "LOWER_OPTIONAL_SIGNAL_WEIGHT",
  DISABLE_VISUAL_REQUIREMENT: "DISABLE_VISUAL_REQUIREMENT",
  EXTEND_TIME_WINDOW: "EXTEND_TIME_WINDOW",
  ALLOW_MANUAL_CONFIRMATION: "ALLOW_MANUAL_CONFIRMATION",
  ALLOW_ALTERNATE_INTERACTION: "ALLOW_ALTERNATE_INTERACTION",
  USE_TRUST_BASED_FALLBACK: "USE_TRUST_BASED_FALLBACK",
  REQUIRE_REVIEW_INSTEAD_OF_DENIAL: "REQUIRE_REVIEW_INSTEAD_OF_DENIAL",
  SKIP_BIOMETRIC_SIGNAL: "SKIP_BIOMETRIC_SIGNAL",
  APPLY_ACCESSIBILITY_SAFE_MODE: "APPLY_ACCESSIBILITY_SAFE_MODE"
} as const;

export type PopsFairnessAdjustmentType =
  (typeof POPS_FAIRNESS_ADJUSTMENT_TYPE)[keyof typeof POPS_FAIRNESS_ADJUSTMENT_TYPE];

export const POPS_FAIRNESS_REASON_CODE = {
  ACCESSIBILITY_SAFE_MODE_APPLIED: "ACCESSIBILITY_SAFE_MODE_APPLIED",
  OPTIONAL_VISUAL_WEIGHT_REMOVED: "OPTIONAL_VISUAL_WEIGHT_REMOVED",
  TOUCH_PATTERN_NOT_USED_FOR_NEGATIVE_SCORING: "TOUCH_PATTERN_NOT_USED_FOR_NEGATIVE_SCORING",
  LOW_MOTION_NOT_PENALIZED: "LOW_MOTION_NOT_PENALIZED",
  SENSOR_QUALITY_DEGRADED_NOT_FRAUD: "SENSOR_QUALITY_DEGRADED_NOT_FRAUD",
  MANUAL_CONFIRMATION_ALLOWED: "MANUAL_CONFIRMATION_ALLOWED",
  REVIEW_USED_INSTEAD_OF_DENIAL: "REVIEW_USED_INSTEAD_OF_DENIAL"
} as const;

export type PopsFairnessReasonCode =
  (typeof POPS_FAIRNESS_REASON_CODE)[keyof typeof POPS_FAIRNESS_REASON_CODE];

export interface PopsFairnessAdjustment {
  id: string;
  sessionId: string;
  userId: string;
  riskType: PopsFairnessRisk;
  adjustmentType: PopsFairnessAdjustmentType;
  originalRequirement: string;
  adjustedRequirement: string;
  reason: string;
  createdAt: string;
}

/** Which multimodal signals are usable for this moment (no biometric labels). */
export type PopsSignalTier = "available" | "degraded" | "unavailable" | "not_applicable";

export interface PopsSignalAvailability {
  visual: PopsSignalTier;
  motion: PopsSignalTier;
  touch: PopsSignalTier;
  audioFeatures: PopsSignalTier;
  deviceSensorQuality: "high" | "medium" | "low";
  networkQuality?: "high" | "medium" | "low";
  environmentStress?: "low" | "medium" | "high";
}

/** Client-reported accessibility signals only — no inferred protected classes. */
export interface PopsAccessibilityContext {
  modes: PopsAccessibilityMode[];
  /** When true, OS reduced-motion preference is active. */
  reducedMotionPreferred?: boolean;
}

export interface ApplyFairnessAdjustmentsInput {
  session: PopsSession;
  signalAvailability: PopsSignalAvailability;
  accessibilityContext: PopsAccessibilityContext;
  campaignRequirements: PopsCampaignVerificationRequirement;
  judgment: PopsJudgment;
}

export interface ApplyFairnessAdjustmentsResult {
  adjustedJudgment: PopsJudgment;
  appliedAdjustments: PopsFairnessAdjustment[];
  fairnessReasonCodes: PopsFairnessReasonCode[];
}
