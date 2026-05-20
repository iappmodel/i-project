import type { PopsAgeBand } from "../config/pops-config.types";
import type { PopsRegionPolicy } from "../config/pops-region-policy";
import type { PopsCampaignVerificationRequirement } from "../campaigns/pops-campaign-requirements.types";
import type { PopsProofLevel, PopsSessionType } from "../../../services/api/src/pops/types/pops.types";

export const POPS_PERMISSION_TYPE = {
  SCREEN_ACTIVITY: "SCREEN_ACTIVITY",
  CONTENT_PROGRESS: "CONTENT_PROGRESS",
  TOUCH_BEHAVIOR: "TOUCH_BEHAVIOR",
  DEVICE_MOTION: "DEVICE_MOTION",
  VISUAL_PRESENCE: "VISUAL_PRESENCE",
  AUDIO_FEATURES: "AUDIO_FEATURES",
  LOCATION_CLASS: "LOCATION_CLASS",
  PRECISE_LOCATION: "PRECISE_LOCATION",
  DEVICE_INTEGRITY: "DEVICE_INTEGRITY",
  ACCOUNT_CONTINUITY: "ACCOUNT_CONTINUITY",
  NOTIFICATIONS: "NOTIFICATIONS",
  BACKGROUND_SYNC: "BACKGROUND_SYNC"
} as const;

export type PopsPermissionType = (typeof POPS_PERMISSION_TYPE)[keyof typeof POPS_PERMISSION_TYPE];

export const POPS_PERMISSION_STATUS = {
  NOT_REQUESTED: "NOT_REQUESTED",
  GRANTED: "GRANTED",
  DENIED: "DENIED",
  LIMITED: "LIMITED",
  SYSTEM_BLOCKED: "SYSTEM_BLOCKED",
  NOT_AVAILABLE: "NOT_AVAILABLE",
  EXPIRED: "EXPIRED"
} as const;

export type PopsPermissionStatus = (typeof POPS_PERMISSION_STATUS)[keyof typeof POPS_PERMISSION_STATUS];

export const POPS_PERMISSION_PURPOSE = {
  BASIC_VERIFICATION: "BASIC_VERIFICATION",
  ATTENTION_VERIFICATION: "ATTENTION_VERIFICATION",
  INTENT_VERIFICATION: "INTENT_VERIFICATION",
  REAL_WORLD_PROOF: "REAL_WORLD_PROOF",
  HIGH_VALUE_REWARD: "HIGH_VALUE_REWARD",
  FRAUD_PREVENTION: "FRAUD_PREVENTION",
  WALLET_SECURITY: "WALLET_SECURITY",
  PAYOUT_SECURITY: "PAYOUT_SECURITY"
} as const;

export type PopsPermissionPurpose =
  (typeof POPS_PERMISSION_PURPOSE)[keyof typeof POPS_PERMISSION_PURPOSE];

export const POPS_PERMISSION_DECLINE_IMPACT = {
  NO_IMPACT: "NO_IMPACT",
  LOWER_CONFIDENCE: "LOWER_CONFIDENCE",
  EXTRA_VERIFICATION_REQUIRED: "EXTRA_VERIFICATION_REQUIRED",
  PARTIAL_REWARD_ONLY: "PARTIAL_REWARD_ONLY",
  REWARD_NOT_AVAILABLE: "REWARD_NOT_AVAILABLE",
  CAMPAIGN_NOT_AVAILABLE: "CAMPAIGN_NOT_AVAILABLE"
} as const;

export type PopsPermissionDeclineImpact =
  (typeof POPS_PERMISSION_DECLINE_IMPACT)[keyof typeof POPS_PERMISSION_DECLINE_IMPACT];

/**
 * Product-level hint for how verification can proceed if a signal is unavailable.
 * OS prompts are separate; this is explanatory copy only.
 */
export type PopsPermissionFallbackMethod =
  | "NONE"
  | "ALTERNATE_SIGNALS"
  | "EXTENDED_SESSION"
  | "MANUAL_REVIEW"
  | "SECOND_FACTOR"
  | "DEFERRED_START";

export interface PopsPermissionRequirement {
  permissionType: PopsPermissionType;
  purpose: PopsPermissionPurpose;
  required: boolean;
  requiredForProofLevel: PopsProofLevel | null;
  requiredForCampaignId: string | null;
  canFallback: boolean;
  fallbackMethod: PopsPermissionFallbackMethod;
  userVisibleReason: string;
  declineImpact: PopsPermissionDeclineImpact;
}

export interface GetRequiredPermissionsForMomentInput {
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  campaignRequirements: PopsCampaignVerificationRequirement | null;
  rewardValue: { amountMinor: number; currencyCode: string };
  ageBand: PopsAgeBand;
  regionPolicy: PopsRegionPolicy;
}

export type PopsPermissionPreflightInput = GetRequiredPermissionsForMomentInput & {
  permissionStatuses: Partial<Record<PopsPermissionType, PopsPermissionStatus>>;
};

export interface PopsPermissionFallbackOption {
  forPermission: PopsPermissionType;
  label: string;
  description: string;
}

export interface PopsPermissionPreflightResult {
  canStart: boolean;
  missingRequiredPermissions: PopsPermissionType[];
  optionalPermissions: PopsPermissionType[];
  fallbackOptions: PopsPermissionFallbackOption[];
  userVisibleMessage: string;
}
