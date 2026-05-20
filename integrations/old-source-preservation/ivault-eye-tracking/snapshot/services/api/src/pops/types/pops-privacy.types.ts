import type { PopsProofLevel, PopsSessionType } from "./pops.types";

export const POPS_PRIVACY_POLICY = {
  DISCARD_RAW: "DISCARD_RAW",
  LOCAL_ONLY: "LOCAL_ONLY",
  STORE_FEATURES_ONLY: "STORE_FEATURES_ONLY",
  STORE_WITH_CONSENT: "STORE_WITH_CONSENT",
  STORE_FOR_KYC_REVIEW: "STORE_FOR_KYC_REVIEW",
  STORE_FOR_FRAUD_REVIEW: "STORE_FOR_FRAUD_REVIEW"
} as const;

export type PopsPrivacyPolicy = (typeof POPS_PRIVACY_POLICY)[keyof typeof POPS_PRIVACY_POLICY];

export interface PopsPrivacyReceipt {
  id: string;
  sessionId: string;
  userId: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  rawCameraStored: boolean;
  rawAudioStored: boolean;
  rawLocationStored: boolean;
  localProcessingUsed: boolean;
  storedFeatureTypes: string[];
  retentionPolicy: PopsPrivacyPolicy;
  userVisibleSummary: string;
  createdAt: string;
}

export interface PopsPrivacyPolicyConfig {
  policy: PopsPrivacyPolicy;
  retentionDays: number;
  allowRawCameraStorage: boolean;
  allowRawAudioStorage: boolean;
  allowRawLocationStorage: boolean;
  allowedFeatureTypes: string[];
}
