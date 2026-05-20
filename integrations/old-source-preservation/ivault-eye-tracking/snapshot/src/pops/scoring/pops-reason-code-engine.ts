export const POPS_REASON_CODES = {
  positive: {
    SCREEN_ACTIVE_VALID: "SCREEN_ACTIVE_VALID",
    APP_FOREGROUND_VALID: "APP_FOREGROUND_VALID",
    CONTENT_PROGRESS_VALID: "CONTENT_PROGRESS_VALID",
    DURATION_REQUIREMENT_MET: "DURATION_REQUIREMENT_MET",
    NATURAL_TOUCH_RHYTHM: "NATURAL_TOUCH_RHYTHM",
    NATURAL_PAUSE_RESUME: "NATURAL_PAUSE_RESUME",
    VALID_DWELL_BEFORE_ACTION: "VALID_DWELL_BEFORE_ACTION",
    VALID_COMPLETION: "VALID_COMPLETION",
    STRONG_ACCOUNT_CONTINUITY: "STRONG_ACCOUNT_CONTINUITY",
    LOW_FRAUD_RISK: "LOW_FRAUD_RISK",
  },
  neutral: {
    OPTIONAL_VISUAL_SIGNAL_MISSING: "OPTIONAL_VISUAL_SIGNAL_MISSING",
    VISUAL_SIGNAL_DEGRADED: "VISUAL_SIGNAL_DEGRADED",
    MOTION_SIGNAL_UNAVAILABLE: "MOTION_SIGNAL_UNAVAILABLE",
    LOW_INTERACTION_DENSITY: "LOW_INTERACTION_DENSITY",
    SESSION_INTERRUPTED: "SESSION_INTERRUPTED",
    PARTIAL_COMPLETION: "PARTIAL_COMPLETION",
    LOW_DWELL_TIME: "LOW_DWELL_TIME",
    SENSOR_QUALITY_LOW: "SENSOR_QUALITY_LOW",
  },
  negative: {
    BACKGROUND_PROGRESS_DETECTED: "BACKGROUND_PROGRESS_DETECTED",
    IMPOSSIBLE_COMPLETION_SPEED: "IMPOSSIBLE_COMPLETION_SPEED",
    HYPER_REGULAR_TOUCH_TIMING: "HYPER_REGULAR_TOUCH_TIMING",
    CTA_TOO_FAST: "CTA_TOO_FAST",
    DUPLICATE_REWARD_ATTEMPT: "DUPLICATE_REWARD_ATTEMPT",
    DEVICE_INTEGRITY_WARNING: "DEVICE_INTEGRITY_WARNING",
    ACCOUNT_CONTINUITY_BREAK: "ACCOUNT_CONTINUITY_BREAK",
    MULTI_ACCOUNT_DEVICE_RISK: "MULTI_ACCOUNT_DEVICE_RISK",
    CAMPAIGN_ABUSE_PATTERN: "CAMPAIGN_ABUSE_PATTERN",
    HIGH_FRAUD_RISK: "HIGH_FRAUD_RISK",
  },
} as const;

type PopsReasonCodeGroup = typeof POPS_REASON_CODES;
export type PopsReasonCode =
  | PopsReasonCodeGroup["positive"][keyof PopsReasonCodeGroup["positive"]]
  | PopsReasonCodeGroup["neutral"][keyof PopsReasonCodeGroup["neutral"]]
  | PopsReasonCodeGroup["negative"][keyof PopsReasonCodeGroup["negative"]];

export interface PopsReasonCodeEntry {
  code: PopsReasonCode;
  scoreArea: "presence" | "attention" | "intent" | "continuity" | "fraudRisk" | "global";
  impact: "positive" | "neutral" | "negative";
  contribution: number;
  internalOnly?: boolean;
}

export class PopsReasonCodeEngine {
  private readonly entries: PopsReasonCodeEntry[] = [];

  add(entry: PopsReasonCodeEntry): void {
    this.entries.push(entry);
  }

  listAll(): PopsReasonCodeEntry[] {
    return [...this.entries];
  }

  listCodes(): PopsReasonCode[] {
    return this.entries.map((entry) => entry.code);
  }

  listAdminCodes(): PopsReasonCode[] {
    return this.entries.map((entry) => entry.code);
  }

  listUserSafeCodes(): PopsReasonCode[] {
    return this.entries.filter((entry) => !entry.internalOnly).map((entry) => entry.code);
  }
}
