import type { PopsJudgment } from "../types/pops-decisions.types";
import type { PopsSession, PopsSessionType, PopsProofLevel } from "../types/pops.types";
import type { PopsRewardDecision } from "../rewards/pops-reward-decision.types";
import type { TrustEvent } from "../trust/pops-trust.types";

export const POPS_SIGNAL_CATEGORY = {
  SCREEN_ACTIVITY: "SCREEN_ACTIVITY",
  CONTENT_PROGRESS: "CONTENT_PROGRESS",
  TOUCH_BEHAVIOR: "TOUCH_BEHAVIOR",
  DEVICE_MOTION: "DEVICE_MOTION",
  APP_STATE: "APP_STATE",
  VISUAL_PRESENCE: "VISUAL_PRESENCE",
  AUDIO_FEATURES: "AUDIO_FEATURES",
  LOCATION_CLASS: "LOCATION_CLASS",
  DEVICE_INTEGRITY: "DEVICE_INTEGRITY",
  ACCOUNT_CONTINUITY: "ACCOUNT_CONTINUITY",
  CAMPAIGN_RULES: "CAMPAIGN_RULES",
  WALLET_RISK: "WALLET_RISK",
  TRUST_HISTORY: "TRUST_HISTORY"
} as const;

export type PopsSignalCategory =
  (typeof POPS_SIGNAL_CATEGORY)[keyof typeof POPS_SIGNAL_CATEGORY];

export const POPS_RAW_DATA_TYPE = {
  RAW_CAMERA_FRAME: "RAW_CAMERA_FRAME",
  RAW_AUDIO_SAMPLE: "RAW_AUDIO_SAMPLE",
  RAW_PRECISE_LOCATION: "RAW_PRECISE_LOCATION",
  RAW_SCREEN_RECORDING: "RAW_SCREEN_RECORDING",
  RAW_BIOMETRIC_TEMPLATE: "RAW_BIOMETRIC_TEMPLATE"
} as const;

export type PopsRawDataType = (typeof POPS_RAW_DATA_TYPE)[keyof typeof POPS_RAW_DATA_TYPE];

export const POPS_STORED_FEATURE_TYPE = {
  PRESENCE_CONFIDENCE: "PRESENCE_CONFIDENCE",
  ATTENTION_CONFIDENCE: "ATTENTION_CONFIDENCE",
  INTENT_CONFIDENCE: "INTENT_CONFIDENCE",
  CONTINUITY_CONFIDENCE: "CONTINUITY_CONFIDENCE",
  FRAUD_RISK: "FRAUD_RISK",
  SESSION_STATE: "SESSION_STATE",
  REASON_CODES: "REASON_CODES",
  REWARD_DECISION: "REWARD_DECISION",
  TRUST_IMPACT: "TRUST_IMPACT",
  DEVICE_INTEGRITY_SCORE: "DEVICE_INTEGRITY_SCORE",
  LOCATION_CLASS: "LOCATION_CLASS",
  PRIVACY_POLICY_VERSION: "PRIVACY_POLICY_VERSION"
} as const;

export type PopsStoredFeatureType =
  (typeof POPS_STORED_FEATURE_TYPE)[keyof typeof POPS_STORED_FEATURE_TYPE];

export const POPS_RETENTION_POLICY = {
  SESSION_ONLY: "SESSION_ONLY",
  THIRTY_DAYS: "THIRTY_DAYS",
  NINETY_DAYS: "NINETY_DAYS",
  ONE_YEAR: "ONE_YEAR",
  FRAUD_REVIEW_REQUIRED: "FRAUD_REVIEW_REQUIRED",
  KYC_REQUIRED: "KYC_REQUIRED",
  LEGAL_REQUIRED: "LEGAL_REQUIRED"
} as const;

export type PopsRetentionPolicy =
  (typeof POPS_RETENTION_POLICY)[keyof typeof POPS_RETENTION_POLICY];

export interface PopsPrivacyReceipt {
  id: string;
  userId: string;
  sessionId: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  decisionId: string | null;
  signalCategoriesUsed: PopsSignalCategory[];
  rawDataTypesStored: PopsRawDataType[];
  storedFeatureTypes: PopsStoredFeatureType[];
  localProcessingUsed: boolean;
  rawDataDiscarded: boolean;
  retentionPolicy: PopsRetentionPolicy;
  retentionExpiresAt: string | null;
  userVisibleSummary: string;
  internalSummary: string;
  policyVersion: string;
  /** Canonical privacy policy artifact id (mirrors `policyVersion` when unset at write time). */
  privacyPolicyVersion?: string;
  retentionPolicyVersion?: string;
  consentPolicyVersion?: string;
  createdAt: string;
}

export interface CreatePopsPrivacyReceiptInput {
  session: PopsSession;
  judgment: PopsJudgment;
  rewardDecision: PopsRewardDecision | null;
  signalCategoriesUsed: PopsSignalCategory[];
  rawDataTypesStored: PopsRawDataType[];
  storedFeatureTypes: PopsStoredFeatureType[];
  localProcessingUsed: boolean;
  retentionPolicy: PopsRetentionPolicy;
  trustEvent?: TrustEvent | null;
  policyVersion?: string;
  privacyPolicyVersion?: string;
  retentionPolicyVersion?: string;
  consentPolicyVersion?: string;
}

export interface PopsPrivacyReceiptRepository {
  save(receipt: PopsPrivacyReceipt): Promise<void>;
}

