import type { PopsProofLevel, PopsSessionType } from "./pops.types";
import type { PopsRewardDecisionStatus } from "./pops-decisions.types";

export type PopsSignalCategory =
  | "SCREEN_ACTIVITY"
  | "CONTENT_PROGRESS"
  | "APP_STATE"
  | "TOUCH_BEHAVIOR"
  | "DEVICE_INTEGRITY"
  | "ACCOUNT_CONTINUITY";

export type PopsRawDataType = "RAW_CAMERA" | "RAW_AUDIO" | "RAW_LOCATION";

export type PopsStoredFeatureType =
  | "PRESENCE_CONFIDENCE"
  | "ATTENTION_CONFIDENCE"
  | "INTENT_CONFIDENCE"
  | "CONTINUITY_CONFIDENCE"
  | "FRAUD_RISK"
  | "REWARD_DECISION"
  | "REASON_CODES";

export type PopsRetentionPolicy = "SESSION_ONLY" | "NINETY_DAYS";

export const POPS_SIGNAL_CATEGORIES: readonly PopsSignalCategory[] = [
  "SCREEN_ACTIVITY",
  "CONTENT_PROGRESS",
  "APP_STATE",
  "TOUCH_BEHAVIOR",
  "DEVICE_INTEGRITY",
  "ACCOUNT_CONTINUITY",
] as const;

export const POPS_RAW_DATA_TYPES: readonly PopsRawDataType[] = ["RAW_CAMERA", "RAW_AUDIO", "RAW_LOCATION"] as const;

export const POPS_STORED_FEATURE_TYPES: readonly PopsStoredFeatureType[] = [
  "PRESENCE_CONFIDENCE",
  "ATTENTION_CONFIDENCE",
  "INTENT_CONFIDENCE",
  "CONTINUITY_CONFIDENCE",
  "FRAUD_RISK",
  "REWARD_DECISION",
  "REASON_CODES",
] as const;

export const POPS_RETENTION_POLICIES: readonly PopsRetentionPolicy[] = ["SESSION_ONLY", "NINETY_DAYS"] as const;

export interface PopsPrivacyReceipt {
  id: string;
  sessionId: string;
  judgmentId: string;
  rewardDecisionId: string;
  userId: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  signalCategoriesUsed: PopsSignalCategory[];
  rawDataTypesStored: PopsRawDataType[];
  storedFeatureTypes: PopsStoredFeatureType[];
  localProcessingUsed: boolean;
  rawDataDiscarded: boolean;
  retentionPolicy: PopsRetentionPolicy;
  retentionExpiresAt: string;
  userVisibleSummary: string;
  internalSummary: string;
  policyVersion: string;
  createdAt: string;
}

export type { PopsRewardDecisionStatus };
