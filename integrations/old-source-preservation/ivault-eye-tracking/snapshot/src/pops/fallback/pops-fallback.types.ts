import type { PopsProofLevel } from "../../../services/api/src/pops/types/pops.types";
import type { PopsTrustImpact } from "../../../services/api/src/pops/types/pops-decisions.types";

/** Audit / reason codes appended to judgments & reward decisions (machine-readable). */
export const POPS_FALLBACK_REASON_CODES = {
  OPTIONAL_VISUAL_REDISTRIBUTED: "pops.fallback.optional_visual_redistributed",
  REQUIRED_VISUAL_FALLBACK_PATH: "pops.fallback.required_visual_fallback_path",
  NETWORK_OFFLINE_SYNC_PENDING: "pops.fallback.network_offline_sync_pending",
  INTERRUPTION_SHORT_CONFIDENCE_TRIM: "pops.fallback.interruption_short_confidence_trim",
  INTERRUPTION_LONG_SESSION_PAUSED: "pops.fallback.interruption_long_session_paused",
  ACCESSIBILITY_ALTERNATE_PROOF: "pops.fallback.accessibility_alternate_proof",
  LOW_BATTERY_SENSOR_DEGRADED: "pops.fallback.low_battery_sensor_degraded",
  SERVER_TIMEOUT_PENDING_REVIEW: "pops.fallback.server_timeout_pending_review",
  SCORING_UNAVAILABLE_PENDING_REVIEW: "pops.fallback.scoring_unavailable_pending_review",
  FRAUD_GATE_RESTRICTS_FALLBACK: "pops.fallback.fraud_gate_restricts_fallback",
  PRIVACY_RECEIPT_FALLBACK_APPLIED: "pops.fallback.privacy_receipt_fallback_applied",
  REGION_POLICY_RESTRICTED: "pops.fallback.region_policy_restricted",
  DEVICE_LIMITATION_PATH: "pops.fallback.device_limitation_path"
} as const;

export type PopsFallbackAuditReasonCode =
  (typeof POPS_FALLBACK_REASON_CODES)[keyof typeof POPS_FALLBACK_REASON_CODES];

export const POPS_FALLBACK_REASON = {
  VISUAL_SIGNAL_UNAVAILABLE: "VISUAL_SIGNAL_UNAVAILABLE",
  MOTION_SIGNAL_UNAVAILABLE: "MOTION_SIGNAL_UNAVAILABLE",
  APP_STATE_UNCERTAIN: "APP_STATE_UNCERTAIN",
  NETWORK_INTERRUPTION: "NETWORK_INTERRUPTION",
  OFFLINE_SYNC_REQUIRED: "OFFLINE_SYNC_REQUIRED",
  LOW_BATTERY_MODE: "LOW_BATTERY_MODE",
  ACCESSIBILITY_MODE: "ACCESSIBILITY_MODE",
  PERMISSION_DECLINED: "PERMISSION_DECLINED",
  SENSOR_DEGRADED: "SENSOR_DEGRADED",
  USER_INTERRUPTED: "USER_INTERRUPTED",
  SERVER_TIMEOUT: "SERVER_TIMEOUT",
  SCORING_UNAVAILABLE: "SCORING_UNAVAILABLE",
  PRIVACY_POLICY_RESTRICTED: "PRIVACY_POLICY_RESTRICTED",
  REGION_POLICY_RESTRICTED: "REGION_POLICY_RESTRICTED",
  DEVICE_LIMITATION: "DEVICE_LIMITATION"
} as const;

export type PopsFallbackReason = (typeof POPS_FALLBACK_REASON)[keyof typeof POPS_FALLBACK_REASON];

export const POPS_FALLBACK_METHOD = {
  EXTRA_DWELL_TIME: "EXTRA_DWELL_TIME",
  MANUAL_CONFIRMATION_TAP: "MANUAL_CONFIRMATION_TAP",
  SIMPLE_ATTENTION_CHECK: "SIMPLE_ATTENTION_CHECK",
  CONTENT_REPLAY_SEGMENT: "CONTENT_REPLAY_SEGMENT",
  CTA_CONFIRMATION: "CTA_CONFIRMATION",
  QR_CONFIRMATION: "QR_CONFIRMATION",
  MERCHANT_CONFIRMATION: "MERCHANT_CONFIRMATION",
  DELAYED_REVIEW: "DELAYED_REVIEW",
  PARTIAL_REWARD: "PARTIAL_REWARD",
  TRUST_BASED_APPROVAL: "TRUST_BASED_APPROVAL",
  ADMIN_REVIEW: "ADMIN_REVIEW",
  NO_REWARD_SAFE_CLOSE: "NO_REWARD_SAFE_CLOSE"
} as const;

export type PopsFallbackMethod = (typeof POPS_FALLBACK_METHOD)[keyof typeof POPS_FALLBACK_METHOD];

export const POPS_FALLBACK_REWARD_IMPACT = {
  NONE: "NONE",
  FULL_REWARD_ALLOWED: "FULL_REWARD_ALLOWED",
  PARTIAL_REWARD_ALLOWED: "PARTIAL_REWARD_ALLOWED",
  HOLD_REQUIRED: "HOLD_REQUIRED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  REWARD_DENIED: "REWARD_DENIED"
} as const;

export type PopsFallbackRewardImpact =
  (typeof POPS_FALLBACK_REWARD_IMPACT)[keyof typeof POPS_FALLBACK_REWARD_IMPACT];

export interface PopsFallbackOption {
  fallbackMethod: PopsFallbackMethod;
  /** Lower is more user-friendly when ordering candidates. */
  priority: number;
  rewardImpact: PopsFallbackRewardImpact;
  requiresUserAction: boolean;
  requiresAdminReview: boolean;
  /** Reason codes this path would add (audit + privacy receipt). */
  auditReasonCodes: PopsFallbackAuditReasonCode[];
  internalRationale: string;
}

export interface PopsFallbackDecision {
  id: string;
  sessionId: string;
  userId: string;
  fallbackReason: PopsFallbackReason;
  fallbackMethod: PopsFallbackMethod;
  originalProofLevel: PopsProofLevel;
  fallbackProofLevel: PopsProofLevel;
  rewardImpact: PopsFallbackRewardImpact;
  trustImpact: PopsTrustImpact;
  requiresUserAction: boolean;
  requiresAdminReview: boolean;
  userVisibleMessage: string;
  createdAt: string;
  /** Additional audit codes beyond method-specific defaults. */
  auditReasonCodes: PopsFallbackAuditReasonCode[];
}

/** Campaign-facing toggles (aligns with `PopsCampaignVerificationRequirement.visualPresenceRequired`). */
export type PopsVisualRequirementMode = "required" | "optional" | "off";

export interface PopsFallbackEvaluationInput {
  sessionId: string;
  userId: string;
  fallbackReason: PopsFallbackReason;
  originalProofLevel: PopsProofLevel;
  /** Normalized 0–1 fraud risk from scoring (must not be downgraded by fallback heuristics). */
  fraudRisk: number;
  visualRequirement: PopsVisualRequirementMode;
  /** Campaign allows alternate verification when primary path fails. */
  campaignAllowsFallbackPath: boolean;
  /** Events were buffered locally and can sync when online. */
  hasLocalEventBuffer: boolean;
  interruptionDurationMs?: number;
  accessibilityModeActive?: boolean;
  lowBatteryModeActive?: boolean;
  serverTimeout?: boolean;
  scoringUnavailable?: boolean;
  trustTier?: number;
}

export interface PopsFallbackSelectionInput extends PopsFallbackEvaluationInput {
  /** Options from `evaluateFallbackOptions` (or pre-filtered). */
  options: PopsFallbackOption[];
  /** When multiple options tie, prefer this method if present. */
  preferredMethod?: PopsFallbackMethod;
}

/** User-visible strings — must stay clear of blame / fraud accusation tone. */
export const POPS_FALLBACK_USER_COPY = {
  generic: "P.O.P.S needs another way to verify this moment.",
  extraDwell: "Keep this moment active a little longer to complete verification.",
  manualConfirm: "Tap to confirm you’re still here.",
  replaySegment: "Replay the final segment to complete verification.",
  review: "This reward will be reviewed before release.",
  partialReward: "Part of this moment was verified. A reduced reward may apply.",
  deniedSafe: "This offer requires proof that could not be completed.",
  offlineSync: "We’ll finish verification when you’re back online.",
  accessibility: "Verification will use options that work with your accessibility settings."
} as const;

/** Copy blocks must never contain these accusatory patterns. */
export const POPS_FALLBACK_FORBIDDEN_USER_PHRASES = [
  "sensor failed you",
  "you looked away",
  "face not detected",
  "suspicious behavior detected",
  "fraud suspected"
] as const;

export function userCopyForMethod(method: PopsFallbackMethod): string {
  switch (method) {
    case POPS_FALLBACK_METHOD.EXTRA_DWELL_TIME:
      return POPS_FALLBACK_USER_COPY.extraDwell;
    case POPS_FALLBACK_METHOD.MANUAL_CONFIRMATION_TAP:
    case POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK:
    case POPS_FALLBACK_METHOD.CTA_CONFIRMATION:
      return POPS_FALLBACK_USER_COPY.manualConfirm;
    case POPS_FALLBACK_METHOD.CONTENT_REPLAY_SEGMENT:
      return POPS_FALLBACK_USER_COPY.replaySegment;
    case POPS_FALLBACK_METHOD.DELAYED_REVIEW:
    case POPS_FALLBACK_METHOD.ADMIN_REVIEW:
      return POPS_FALLBACK_USER_COPY.review;
    case POPS_FALLBACK_METHOD.PARTIAL_REWARD:
      return POPS_FALLBACK_USER_COPY.partialReward;
    case POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE:
      return POPS_FALLBACK_USER_COPY.deniedSafe;
    case POPS_FALLBACK_METHOD.QR_CONFIRMATION:
    case POPS_FALLBACK_METHOD.MERCHANT_CONFIRMATION:
      return POPS_FALLBACK_USER_COPY.generic;
    case POPS_FALLBACK_METHOD.TRUST_BASED_APPROVAL:
      return POPS_FALLBACK_USER_COPY.review;
    default:
      return POPS_FALLBACK_USER_COPY.generic;
  }
}
