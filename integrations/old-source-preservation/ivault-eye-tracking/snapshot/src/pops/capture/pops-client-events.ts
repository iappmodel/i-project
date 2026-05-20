export type PopsSessionState =
  | "IDLE"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CLOSED";

export type PopsSessionType = "STANDARD" | "REWARD" | "CHECKPOINT";
export type PopsProofLevel = "BASIC" | "ATTENTION";

export type PopsEventType =
  | "SESSION_STARTED"
  | "SCREEN_ACTIVE"
  | "APP_FOREGROUNDED"
  | "APP_BACKGROUNDED"
  | "CONTENT_STARTED"
  | "CONTENT_PROGRESS"
  | "CONTENT_PAUSED"
  | "CONTENT_RESUMED"
  | "CONTENT_COMPLETED"
  | "TOUCH_TAP"
  | "TOUCH_SCROLL"
  | "TOUCH_SWIPE"
  | "MOTION_STABLE"
  | "MOTION_UNSTABLE"
  | "NOTIFICATION_INTERRUPTION"
  | "REWARD_CHECKPOINT"
  | "DEVICE_INTEGRITY_WARNING"
  | "SESSION_ENDED";

export type PopsReasonCode =
  | "IMPOSSIBLE_PROGRESS"
  | "BACKGROUND_PROGRESS"
  | "TOO_FAST_COMPLETION"
  | "LOW_INTERACTION_DENSITY"
  | "HYPER_REGULAR_TOUCH_PATTERN"
  | "REPEATED_INTERRUPTION_PATTERN"
  | "DEVICE_INTEGRITY_LOW"
  | "SESSION_DEGRADED"
  | "VALID_BASIC_SESSION"
  | "VALID_ATTENTION_SESSION";

export type PopsSignalType =
  | "SCREEN_ACTIVE"
  | "APP_FOREGROUNDED"
  | "APP_BACKGROUNDED"
  | "CONTENT_PROGRESS"
  | "CONTENT_PAUSED"
  | "CONTENT_RESUMED"
  | "TOUCH_TAP"
  | "TOUCH_SCROLL"
  | "TOUCH_SWIPE"
  | "MOTION_STABLE"
  | "MOTION_UNSTABLE"
  | "NOTIFICATION_INTERRUPTION"
  | "DEVICE_INTEGRITY_WARNING"
  | "ACCOUNT_CONTINUITY_OK";

export type PopsSessionStartInput = {
  userId: string;
  deviceId: string;
  contentId: string;
  campaignId: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  requiredDurationMs: number;
};

export type PopsSession = PopsSessionStartInput & {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
};

export type PopsClientEvent = {
  id: string;
  type: PopsEventType;
  timestamp: number;
  payload?: Record<string, unknown>;
};

export type PopsSignalItem = {
  type: PopsSignalType;
  timestamp: number;
  value?: number | boolean | string;
  payload?: Record<string, unknown>;
};

export type PopsSignalBatch = {
  sessionId: string;
  createdAt: number;
  signals: PopsSignalItem[];
};

export type PopsScoringSnapshot = {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  fraudRisk: number;
  rewardEligibility: boolean;
  recommendedAction: string;
  isRewardLikely: boolean;
  isVerificationDegraded: boolean;
  isHeldForReview: boolean;
  reasonCodes: PopsReasonCode[];
};

export const IMPORTANT_EVENTS: ReadonlySet<PopsEventType> = new Set([
  "SESSION_STARTED",
  "APP_BACKGROUNDED",
  "CONTENT_COMPLETED",
  "REWARD_CHECKPOINT",
  "SESSION_ENDED",
  "DEVICE_INTEGRITY_WARNING",
]);

