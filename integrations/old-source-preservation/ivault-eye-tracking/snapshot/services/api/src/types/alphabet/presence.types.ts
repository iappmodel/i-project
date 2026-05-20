import type { AlphabetEvent } from "./event.types";

export type PresenceContext =
  | "local_offer"
  | "store_visit"
  | "event_checkin"
  | "pickup"
  | "service_visit"
  | "community_place"
  | "learning_place"
  | "workplace"
  | "general_place";

export type PresenceVerificationStatus =
  | "presence_verified"
  | "local_action_verified"
  | "completed_needs_review"
  | "incomplete"
  | "rejected"
  | "suspicious";

export type PresenceSessionStatus =
  | "started"
  | "arrived"
  | "completed"
  | "verified"
  | "local_action_verified"
  | "needs_review"
  | "incomplete"
  | "rejected"
  | "suspicious"
  | "expired";

export interface LocalOffer {
  offerId: string;
  businessId: string;
  locationId: string;
  title: string;
  description?: string | null;
  context: PresenceContext;
  rewardCoin: "P" | "I" | "A" | "E" | "V";
  expectedRewardAmount: number;
  requiresPurchaseProof: boolean;
  requiresQrProof: boolean;
  requiresNfcProof: boolean;
  requiresBluetoothProof: boolean;
  minAgeBand?: string | null;
  guardianRequiredForMinors: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresenceSession {
  presenceSessionId: string;
  userId: string;
  context: PresenceContext;
  offerId?: string | null;
  businessId?: string | null;
  locationId?: string | null;
  requiredDwellMs: number;
  dwellMs: number;
  status: PresenceSessionStatus;
  ageBand: string;
  startedAt: string;
  arrivedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
}

export interface PresenceSignalInput {
  presenceSessionId: string;
  userId: string;
  context: PresenceContext;
  offerId?: string | null;
  businessId?: string | null;
  locationId?: string | null;
  requiredDwellMs: number;
  dwellMs: number;
  geofenceMatchScore: number;
  movementConsistencyScore: number;
  deviceLocationIntegrityScore: number;
  networkLocationCorroborationScore: number;
  qrProofScore: number;
  nfcProofScore: number;
  bluetoothProofScore: number;
  purchaseProofScore: number;
  staffConfirmationScore: number;
  actionCompletionScore: number;
  gpsSpoofingRisk: number;
  emulatorRisk: number;
  duplicateCheckinRisk: number;
  impossibleTravelRisk: number;
  businessCollusionRisk: number;
  deviceIntegrityScore: number;
  ageBand: string;
  metadata?: Record<string, unknown>;
}

export interface PresenceRuleSet {
  context: PresenceContext;
  minDwellRatio: number;
  minDwellMs: number;
  minGeofenceMatchScore: number;
  minMovementConsistencyScore: number;
  minDeviceLocationIntegrityScore: number;
  minNetworkLocationCorroborationScore: number;
  minPresenceScore: number;
  minLocalActionScore: number;
  minQualityScore: number;
  maxRiskScore: number;
  maxGpsSpoofingRisk: number;
  maxImpossibleTravelRisk: number;
  maxDuplicateCheckinRisk: number;
  maxBusinessCollusionRisk: number;
  under13Allowed: boolean;
  teenAllowed: boolean;
  guardianRequiredForUnder13: boolean;
  requiresActionProof: boolean;
  requiresPurchaseProof: boolean;
  active: boolean;
}

export interface PresenceVerificationResult {
  presenceSessionId: string;
  userId: string;
  status: PresenceVerificationStatus;
  dwellRatio: number;
  presenceScore: number;
  localActionScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
  sessionStartedEvent: AlphabetEvent;
  presenceVerifiedEvent?: AlphabetEvent | null;
  localActionCompletedEvent?: AlphabetEvent | null;
  localOfferRedeemedEvent?: AlphabetEvent | null;
  spoofingEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
