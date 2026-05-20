import type { AlphabetEvent } from "./event.types";

export type IdentityProofLevel =
  | "none"
  | "device_verified"
  | "email_verified"
  | "phone_verified"
  | "payment_verified"
  | "document_verified"
  | "institution_verified"
  | "guardian_verified"
  | "business_verified"
  | "platform_verified";

export type ReputationProfileStatus =
  | "created"
  | "emerging"
  | "credible"
  | "reputation_verified"
  | "identity_strengthened"
  | "needs_review"
  | "suspicious"
  | "restricted";

export type ReputationVerificationStatus =
  | "reputation_verified"
  | "identity_strengthened"
  | "credible_profile"
  | "emerging_profile"
  | "needs_review"
  | "suspicious"
  | "restricted";

export interface ReputationProfile {
  reputationProfileId: string;
  userId: string;
  identityProofLevel: IdentityProofLevel;
  identityStrengthScore: number;
  reputationScore: number;
  credibilityScore: number;
  riskScore: number;
  status: ReputationProfileStatus;
  ageBand: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReputationSignalInput {
  reputationProfileId: string;
  userId: string;
  identityProofLevel: IdentityProofLevel;
  accountAgeDays: number;
  trustScore: number;
  uValueScore: number;
  walletIntegrityScore: number;
  accountIntegrityScore: number;
  contributionScore: number;
  creatorReputationScore: number;
  workerReputationScore: number;
  helperReputationScore: number;
  safetyReputationScore: number;
  judgmentReputationScore: number;
  learningReputationScore: number;
  masteryReputationScore: number;
  exchangeReliabilityScore: number;
  verifiedEventCount: number;
  negativeEventCount: number;
  severeNegativeEventCount: number;
  impersonationRisk: number;
  syntheticIdentityRisk: number;
  reputationFarmingRisk: number;
  banEvasionRisk: number;
  deviceIntegrityScore: number;
  ageBand: string;
  metadata?: Record<string, unknown>;
}

export interface ReputationRuleSet {
  minAccountAgeDays: number;
  minTrustScore: number;
  minUValueScore: number;
  minIdentityStrengthScore: number;
  minReputationScore: number;
  minCredibilityScore: number;
  minVerifiedEventCount: number;
  maxRiskScore: number;
  maxImpersonationRisk: number;
  maxSyntheticIdentityRisk: number;
  maxReputationFarmingRisk: number;
  maxBanEvasionRisk: number;
  under13Allowed: boolean;
  teenAllowed: boolean;
  requiresGuardianForUnder13: boolean;
  active: boolean;
}

export interface ReputationVerificationResult {
  reputationProfileId: string;
  userId: string;
  status: ReputationVerificationStatus;
  identityStrengthScore: number;
  reputationScore: number;
  credibilityScore: number;
  riskScore: number;
  reasons: string[];
  identityStrengthenedEvent?: AlphabetEvent | null;
  reputationVerifiedEvent?: AlphabetEvent | null;
  profileCredibilityUpdatedEvent: AlphabetEvent;
  impersonationRiskEvent?: AlphabetEvent | null;
  syntheticIdentityRiskEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
