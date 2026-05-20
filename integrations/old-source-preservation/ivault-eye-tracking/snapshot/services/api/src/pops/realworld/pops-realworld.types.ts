import type { PopsRetentionPolicy } from "../privacy/pops-privacy-receipt.types";
import type { PopsProofLevel } from "../types/pops.types";

/** Minimum proof tier that may use real-world merchant / location proof (Stage 35). */
export const POPS_REAL_WORLD_MIN_PROOF_LEVEL: PopsProofLevel = "LEVEL_4_IDENTITY_CONTINUITY";

export function realWorldProofAllowedForLevel(level: PopsProofLevel): boolean {
  const order: Record<PopsProofLevel, number> = {
    LEVEL_0_NONE: 0,
    LEVEL_1_SESSION: 1,
    LEVEL_2_ATTENTION: 2,
    LEVEL_3_INTENT: 3,
    LEVEL_4_IDENTITY_CONTINUITY: 4,
    LEVEL_5_HIGH_VALUE: 5,
  };
  return order[level] >= order[POPS_REAL_WORLD_MIN_PROOF_LEVEL];
}

export const POPS_REAL_WORLD_PROOF_TYPE = {
  LOCATION_CLASS: "LOCATION_CLASS",
  PRECISE_GEOFENCE: "PRECISE_GEOFENCE",
  QR_SCAN: "QR_SCAN",
  NFC_TAP: "NFC_TAP",
  MERCHANT_CONFIRMATION: "MERCHANT_CONFIRMATION",
  RECEIPT_CONFIRMATION: "RECEIPT_CONFIRMATION",
  DWELL_TIME: "DWELL_TIME",
  MOTION_CONSISTENCY: "MOTION_CONSISTENCY",
  TIME_WINDOW: "TIME_WINDOW",
} as const;

export type PopsRealWorldProofType =
  (typeof POPS_REAL_WORLD_PROOF_TYPE)[keyof typeof POPS_REAL_WORLD_PROOF_TYPE];

/** Broad location bucket — prefer this over precise coordinates when possible. */
export const POPS_LOCATION_CLASS = {
  UNKNOWN: "UNKNOWN",
  HOME_OR_WORK_WIFI: "HOME_OR_WORK_WIFI",
  NEIGHBORHOOD: "NEIGHBORHOOD",
  CITY: "CITY",
  REGION: "REGION",
  COUNTRY: "COUNTRY",
  MERCHANT_VICINITY: "MERCHANT_VICINITY",
} as const;

export type PopsLocationClass = (typeof POPS_LOCATION_CLASS)[keyof typeof POPS_LOCATION_CLASS];

export type PopsRealWorldFraudRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PopsRealWorldRecommendedAction =
  | "ALLOW"
  | "HOLD_REVIEW"
  | "DENY"
  | "REQUEST_ADDITIONAL_PROOF";

export interface PopsRealWorldProof {
  id: string;
  sessionId: string;
  userId: string;
  campaignId: string;
  merchantId: string;
  proofTypes: PopsRealWorldProofType[];
  locationClass: PopsLocationClass | null;
  geofenceConfidence: number | null;
  qrScanId: string | null;
  nfcTapId: string | null;
  merchantConfirmationId: string | null;
  receiptId: string | null;
  dwellTimeMs: number | null;
  motionConsistencyScore: number | null;
  timeWindowValid: boolean;
  fraudRisk: PopsRealWorldFraudRisk;
  createdAt: string;
}

export interface PopsRealWorldDecision {
  realWorldPresenceConfidence: number;
  merchantProofConfidence: number;
  locationFraudRisk: PopsRealWorldFraudRisk;
  recommendedAction: PopsRealWorldRecommendedAction;
  reasons: string[];
}

/** User-visible strings for real-world flows (Stage 35). */
export const POPS_REALWORLD_USER_COPY = {
  verifyingVisit: "P.O.P.S is verifying this visit.",
  locationProofActive: "Location proof active for this offer.",
  scanConfirmed: "Scan confirmed.",
  merchantConfirmationReceived: "Merchant confirmation received.",
  visitVerified: "Visit verified.",
  visitRewardPending: "Visit reward pending.",
} as const;

/** Fields surfaced on the privacy receipt for real-world proof. */
export interface PopsRealWorldPrivacyDisclosure {
  locationClassUsed: PopsLocationClass | null;
  preciseLocationUsed: boolean;
  qrUsed: boolean;
  nfcUsed: boolean;
  merchantConfirmationUsed: boolean;
  retentionPolicy: PopsRetentionPolicy;
}

export interface PopsSignedQrPayload {
  qrScanId: string;
  jti: string;
  campaignId: string;
  merchantId: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

export interface PopsSignedNfcPayload {
  nfcTapId: string;
  terminalId: string;
  sessionToken: string;
  merchantId: string;
  deviceBindingId: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

export interface PopsMerchantConfirmationPayload {
  merchantConfirmationId: string;
  merchantId: string;
  campaignId: string;
  sessionId: string;
  userId: string;
  action: "VISIT" | "CHECK_IN" | "REWARD_TRIGGER";
  confirmedAtMs: number;
}
