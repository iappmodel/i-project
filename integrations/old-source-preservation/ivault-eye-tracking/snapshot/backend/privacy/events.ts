import {
  DataClass,
  PrivacyPurpose,
  RetentionPolicy,
  RawSignalType,
  EconomicProofType,
} from "./types";

export enum PrivacyEventType {
  RawSignalStarted = "raw_signal_started",
  RawSignalInterpreted = "raw_signal_interpreted",
  RawSignalDeleted = "raw_signal_deleted",
  AttentionVerified = "attention_verified",
  RewardProofCreated = "reward_proof_created",
  UserPrivateStorageEnabled = "user_private_storage_enabled",
  UserPrivateStorageDisabled = "user_private_storage_disabled",
  ConsentGranted = "consent_granted",
  ConsentRevoked = "consent_revoked",
  EconomicProofRetained = "economic_proof_retained",
  RetentionPolicyApplied = "retention_policy_applied",
}

export interface PrivacyEventContract<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  event_id: string;
  user_id: string;
  event_type: PrivacyEventType;
  data_class: DataClass;
  purpose: PrivacyPurpose;
  created_at: string;
  retention_policy: RetentionPolicy;
  raw_data_included: false;
  actor: string;
  metadata: TMetadata;
}

export interface RawSignalStartedMetadata {
  session_id: string;
  signal_type: RawSignalType;
  processing_location: string;
}

export interface RewardProofMetadata {
  proof_id: string;
  proof_type: EconomicProofType;
  campaign_id: string;
  reward_amount_minor: number;
}
