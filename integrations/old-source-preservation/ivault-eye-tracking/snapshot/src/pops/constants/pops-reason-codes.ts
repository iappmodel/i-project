export type PopsReasonCode =
  | "SCREEN_ACTIVE_VALID"
  | "APP_FOREGROUND_VALID"
  | "CONTENT_PROGRESS_VALID"
  | "DURATION_REQUIREMENT_MET"
  | "COMPLETION_REQUIREMENT_MET"
  | "VALID_COMPLETION"
  | "LOW_FRAUD_RISK"
  | "DEVICE_INTEGRITY_VALID"
  | "ACCOUNT_CONTINUITY_VALID"
  | "PRIVACY_RECEIPT_CREATED"
  | "WALLET_INTENT_CREATED"
  | "PARTIAL_COMPLETION"
  | "LOW_DWELL_TIME"
  | "LOW_INTERACTION_DENSITY"
  | "SESSION_INTERRUPTED"
  | "APP_BACKGROUND_SHORT"
  | "SENSOR_QUALITY_LOW"
  | "BACKGROUND_PROGRESS_DETECTED"
  | "IMPOSSIBLE_COMPLETION_SPEED"
  | "IMPOSSIBLE_COMPLETION"
  | "DEVICE_INTEGRITY_WARNING"
  | "ACCOUNT_CONTINUITY_BREAK"
  | "HIGH_FRAUD_RISK"
  | "REWARD_APPROVED_FULL"
  | "REWARD_APPROVED_PARTIAL"
  | "REWARD_HELD"
  | "REWARD_DENIED"
  | "PRIVACY_RECEIPT_REQUIRED"
  | "APPROVED_FULL"
  | "APPROVED_PARTIAL"
  | "HELD_REVIEW"
  | "DENIED_LOW_CONFIDENCE"
  | "DENIED_FRAUD_RISK"
  | "DUPLICATE_EVENT_DROPPED"
  | "INVALID_EVENT_DROPPED"
  | "CLIENT_SCORE_FIELD_REMOVED"
  | "EVENT_SEQUENCE_INVALID"
  | "EVENT_NORMALIZED"
  | "EVENT_BURST_DETECTED"
  | "TIMESTAMP_DRIFT_SEVERE"
  | "DEVICE_INTEGRITY_SIGNAL_LOW";

/** Flat codes used by reward decisions, scoring V1, and event normalization. */
export const POPS_REASON_CODES = {
  APPROVED_FULL: "APPROVED_FULL",
  APPROVED_PARTIAL: "APPROVED_PARTIAL",
  HELD_REVIEW: "HELD_REVIEW",
  DENIED_LOW_CONFIDENCE: "DENIED_LOW_CONFIDENCE",
  DENIED_FRAUD_RISK: "DENIED_FRAUD_RISK",
  BACKGROUND_PROGRESS_DETECTED: "BACKGROUND_PROGRESS_DETECTED",
  IMPOSSIBLE_COMPLETION: "IMPOSSIBLE_COMPLETION",
  IMPOSSIBLE_COMPLETION_SPEED: "IMPOSSIBLE_COMPLETION_SPEED",
  DUPLICATE_EVENT_DROPPED: "DUPLICATE_EVENT_DROPPED",
  INVALID_EVENT_DROPPED: "INVALID_EVENT_DROPPED",
  CLIENT_SCORE_FIELD_REMOVED: "CLIENT_SCORE_FIELD_REMOVED",
  EVENT_SEQUENCE_INVALID: "EVENT_SEQUENCE_INVALID",
  EVENT_NORMALIZED: "EVENT_NORMALIZED",
  SENSOR_QUALITY_LOW: "SENSOR_QUALITY_LOW",
  EVENT_BURST_DETECTED: "EVENT_BURST_DETECTED",
  TIMESTAMP_DRIFT_SEVERE: "TIMESTAMP_DRIFT_SEVERE",
  DEVICE_INTEGRITY_SIGNAL_LOW: "DEVICE_INTEGRITY_SIGNAL_LOW",
} as const satisfies Record<string, PopsReasonCode>;

export const POPS_REASON_CODE_USER_SAFE_COPY: Record<PopsReasonCode, string> = {
  SCREEN_ACTIVE_VALID: "This moment met on-screen presence checks.",
  APP_FOREGROUND_VALID: "This moment met foreground presence checks.",
  CONTENT_PROGRESS_VALID: "Content progress was recorded for this moment.",
  DURATION_REQUIREMENT_MET: "The watch duration requirement was met.",
  COMPLETION_REQUIREMENT_MET: "The completion requirement was met.",
  VALID_COMPLETION: "Completion was recorded for this moment.",
  LOW_FRAUD_RISK: "Risk signals for this moment were low.",
  DEVICE_INTEGRITY_VALID: "Device checks for this moment looked consistent.",
  ACCOUNT_CONTINUITY_VALID: "Account continuity for this moment looked consistent.",
  PRIVACY_RECEIPT_CREATED: "A privacy receipt was created for this moment.",
  WALLET_INTENT_CREATED: "A wallet release step was queued for this moment.",
  PARTIAL_COMPLETION: "This moment was only partially completed.",
  LOW_DWELL_TIME: "This moment had limited active time.",
  LOW_INTERACTION_DENSITY: "This moment had limited interaction signals.",
  SESSION_INTERRUPTED: "This moment was interrupted.",
  APP_BACKGROUND_SHORT: "The app was briefly in the background.",
  SENSOR_QUALITY_LOW: "Signal quality was lower than ideal for this moment.",
  BACKGROUND_PROGRESS_DETECTED: "This moment could not be fully verified.",
  IMPOSSIBLE_COMPLETION_SPEED: "This offer requirement was not completed.",
  IMPOSSIBLE_COMPLETION: "This offer requirement was not completed.",
  DEVICE_INTEGRITY_WARNING: "This reward requires additional review.",
  ACCOUNT_CONTINUITY_BREAK: "This moment could not be fully verified.",
  HIGH_FRAUD_RISK: "This moment could not be verified.",
  REWARD_APPROVED_FULL: "This moment qualified for the full reward.",
  REWARD_APPROVED_PARTIAL: "This moment qualified for a reduced reward.",
  REWARD_HELD: "This reward is under review.",
  REWARD_DENIED: "This reward could not be approved for this moment.",
  PRIVACY_RECEIPT_REQUIRED: "A privacy receipt is required before release.",
  APPROVED_FULL: "This moment qualified for the full reward.",
  APPROVED_PARTIAL: "This moment qualified for a reduced reward.",
  HELD_REVIEW: "This reward is under review.",
  DENIED_LOW_CONFIDENCE: "This reward could not be approved for this moment.",
  DENIED_FRAUD_RISK: "This moment could not be verified.",
  DUPLICATE_EVENT_DROPPED: "A duplicate event record was removed before scoring.",
  INVALID_EVENT_DROPPED: "An invalid event record was removed before scoring.",
  CLIENT_SCORE_FIELD_REMOVED: "Client-submitted score fields were removed before scoring.",
  EVENT_SEQUENCE_INVALID: "Content events arrived out of the expected order.",
  EVENT_NORMALIZED: "Event fields were adjusted for consistent scoring.",
  EVENT_BURST_DETECTED: "Events arrived in a very dense burst.",
  TIMESTAMP_DRIFT_SEVERE: "Event timestamps were far from the session window.",
  DEVICE_INTEGRITY_SIGNAL_LOW: "Device integrity signals were weaker than ideal.",
};
