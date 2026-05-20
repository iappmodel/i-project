export const POPS_PROOF_LEVEL = {
  LEVEL_0_NONE: "LEVEL_0_NONE",
  LEVEL_1_SESSION: "LEVEL_1_SESSION",
  LEVEL_2_ATTENTION: "LEVEL_2_ATTENTION",
  LEVEL_3_INTENT: "LEVEL_3_INTENT",
  LEVEL_4_IDENTITY_CONTINUITY: "LEVEL_4_IDENTITY_CONTINUITY",
  LEVEL_5_HIGH_VALUE: "LEVEL_5_HIGH_VALUE"
} as const;

export type PopsProofLevel = (typeof POPS_PROOF_LEVEL)[keyof typeof POPS_PROOF_LEVEL];

export const POPS_SESSION_TYPE = {
  FEED_VIEW: "FEED_VIEW",
  SPONSORED_WATCH: "SPONSORED_WATCH",
  CREATOR_CONTENT: "CREATOR_CONTENT",
  BRAND_CAMPAIGN: "BRAND_CAMPAIGN",
  SURVEY: "SURVEY",
  LEARNING: "LEARNING",
  GPS_CHECK_IN: "GPS_CHECK_IN",
  QR_SCAN: "QR_SCAN",
  NFC_MERCHANT: "NFC_MERCHANT",
  WALLET_CONVERSION: "WALLET_CONVERSION",
  WITHDRAWAL_REVIEW: "WITHDRAWAL_REVIEW",
  TIP_SEND: "TIP_SEND",
  PURCHASE_INTENT: "PURCHASE_INTENT",
  ACCOUNT_VERIFICATION: "ACCOUNT_VERIFICATION"
} as const;

export type PopsSessionType = (typeof POPS_SESSION_TYPE)[keyof typeof POPS_SESSION_TYPE];

export const POPS_SESSION_STATE = {
  NOT_STARTED: "NOT_STARTED",
  INITIALIZING: "INITIALIZING",
  DETECTING: "DETECTING",
  PRESENT_IDLE: "PRESENT_IDLE",
  ENGAGED_PASSIVE: "ENGAGED_PASSIVE",
  ENGAGED_ACTIVE: "ENGAGED_ACTIVE",
  FOCUSED: "FOCUSED",
  DISTRACTED: "DISTRACTED",
  INTERRUPTED: "INTERRUPTED",
  DEGRADED: "DEGRADED",
  UNCERTAIN: "UNCERTAIN",
  SUSPICIOUS: "SUSPICIOUS",
  FRAUD_LIKELY: "FRAUD_LIKELY",
  COMPLETED: "COMPLETED",
  REWARD_PENDING: "REWARD_PENDING",
  REWARD_APPROVED: "REWARD_APPROVED",
  REWARD_PARTIAL: "REWARD_PARTIAL",
  REWARD_DENIED: "REWARD_DENIED",
  CLOSED: "CLOSED"
} as const;

export type PopsSessionState = (typeof POPS_SESSION_STATE)[keyof typeof POPS_SESSION_STATE];

export const POPS_SIGNAL_SOURCE = {
  SCREEN: "SCREEN",
  CONTENT: "CONTENT",
  TOUCH: "TOUCH",
  MOTION: "MOTION",
  VISUAL: "VISUAL",
  AUDIO_FEATURES: "AUDIO_FEATURES",
  APP_STATE: "APP_STATE",
  DEVICE_INTEGRITY: "DEVICE_INTEGRITY",
  LOCATION_CLASS: "LOCATION_CLASS",
  ACCOUNT_CONTINUITY: "ACCOUNT_CONTINUITY",
  CAMPAIGN_RULES: "CAMPAIGN_RULES",
  WALLET_RISK: "WALLET_RISK",
  TRUST_SYSTEM: "TRUST_SYSTEM"
} as const;

export type PopsSignalSource = (typeof POPS_SIGNAL_SOURCE)[keyof typeof POPS_SIGNAL_SOURCE];

export interface PopsSession {
  id: string;
  userId: string;
  deviceId: string;
  contentId: string | null;
  campaignId: string | null;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  state: PopsSessionState;
  startedAt: string;
  endedAt: string | null;
  requiredDurationMs: number;
  minimumPresenceConfidence: number;
  minimumAttentionConfidence: number;
  minimumIntentConfidence: number;
  maximumFraudRisk: number;
  metadata: Record<string, unknown>;
}

export interface PopsSignalBatchSignals {
  screenActive: boolean;
  appForegrounded: boolean;
  contentProgressPct: number;
  contentPositionMs: number;
  touchIntentScore: number;
  motionStabilityScore: number;
  visualPresenceScore: number | null;
  audioDistractionScore: number;
  deviceIntegrityScore: number;
  accountContinuityScore: number;
  locationClassConfidence: number;
}

export interface PopsSignalBatchPrivacy {
  rawCameraStored: boolean;
  rawAudioStored: boolean;
  rawLocationStored: boolean;
  localFeatureExtractionUsed: boolean;
  retentionPolicy: string;
}

export interface PopsSignalBatch {
  sessionId: string;
  userId: string;
  timestampMs: number;
  signals: PopsSignalBatchSignals;
  privacy: PopsSignalBatchPrivacy;
}
