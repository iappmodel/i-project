import type { AlphabetEvent } from "./event.types";
import type {
  ComplianceStatus,
  KycStatus,
  TaxProfileStatus
} from "./withdrawal.types";

export type PolicyAgeBand =
  | "under_13"
  | "13_15"
  | "16_17"
  | "18_plus"
  | "unknown";

export type PolicyUserRole =
  | "user"
  | "creator"
  | "business"
  | "guardian"
  | "admin"
  | "reviewer"
  | "child"
  | "teen";

export type PolicyContext =
  | "content_view"
  | "content_create"
  | "content_monetize"
  | "reward_earn"
  | "wallet_view"
  | "conversion"
  | "withdrawal"
  | "local_presence"
  | "marketplace_work"
  | "creator_service"
  | "campaign_participation"
  | "learning"
  | "grant_eligibility"
  | "identity_verification"
  | "safety_report"
  | "messaging"
  | "admin_review";

export type PolicyRiskCategory =
  | "none"
  | "adult_content"
  | "financial"
  | "location"
  | "messaging"
  | "public_exposure"
  | "labor"
  | "commerce"
  | "identity"
  | "safety"
  | "regulated"
  | "sensitive";

export type PolicyStatus =
  | "allowed"
  | "allowed_with_guardian"
  | "allowed_with_limits"
  | "requires_review"
  | "blocked_age"
  | "blocked_region"
  | "blocked_compliance"
  | "blocked_risk";

export interface PolicyCheck {
  policyCheckId: string;
  userId: string;
  ageBand: PolicyAgeBand;
  userRole: PolicyUserRole;
  context: PolicyContext;
  actionType: string;
  riskCategory: PolicyRiskCategory;
  region: string;
  countryCode: string;
  status: PolicyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PolicySignalInput {
  policyCheckId: string;
  userId: string;
  ageBand: PolicyAgeBand;
  userRole: PolicyUserRole;
  context: PolicyContext;
  actionType: string;
  riskCategory: PolicyRiskCategory;
  region: string;
  countryCode: string;
  guardianApproved: boolean;
  schoolApproved: boolean;
  businessApproved: boolean;
  kycStatus: KycStatus;
  taxProfileStatus: TaxProfileStatus;
  complianceStatus: ComplianceStatus;
  trustScore: number;
  uValueScore: number;
  safetyRisk: number;
  financialRisk: number;
  privacyRisk: number;
  contentRisk: number;
  locationRisk: number;
  messagingRisk: number;
  laborRisk: number;
  identityRisk: number;
  regionRestricted: boolean;
  regionRequiresKyc: boolean;
  regionRequiresTaxProfile: boolean;
  regionRequiresGuardianForMinors: boolean;
  metadata?: Record<string, unknown>;
}

export interface PolicyRuleSet {
  context: PolicyContext;
  minTrustScore: number;
  minUValueScore: number;
  minPolicyEligibilityScore: number;
  minAgeSafetyScore: number;
  minRegionalComplianceScore: number;
  maxRiskScore: number;
  maxSafetyRisk: number;
  maxFinancialRisk: number;
  maxPrivacyRisk: number;
  maxContentRisk: number;
  maxLocationRisk: number;
  maxMessagingRisk: number;
  maxLaborRisk: number;
  maxIdentityRisk: number;
  allowUnder13: boolean;
  allow13To15: boolean;
  allow16To17: boolean;
  allowUnknownAge: boolean;
  guardianCanUnlockUnder13: boolean;
  guardianCanUnlockTeen: boolean;
  schoolCanUnlock: boolean;
  businessCanUnlock: boolean;
  requiresKyc: boolean;
  requiresTaxProfile: boolean;
  requiresComplianceClear: boolean;
  restrictMonetizationForMinors: boolean;
  restrictMessagingForMinors: boolean;
  restrictLocalPresenceForMinors: boolean;
  restrictWithdrawalsForMinors: boolean;
  restrictPublicExposureForMinors: boolean;
  active: boolean;
}

export interface PolicyDecisionResult {
  policyCheckId: string;
  userId: string;
  status: PolicyStatus;
  policyEligibilityScore: number;
  ageSafetyScore: number;
  regionalComplianceScore: number;
  riskScore: number;
  allowAction: boolean;
  requireGuardian: boolean;
  requireKyc: boolean;
  requireTaxProfile: boolean;
  requireReview: boolean;
  restrictMonetization: boolean;
  restrictMessaging: boolean;
  restrictWithdrawal: boolean;
  restrictLocalPresence: boolean;
  restrictContentExposure: boolean;
  blockAction: boolean;
  reasons: string[];
  policyCheckCreatedEvent: AlphabetEvent;
  policyAllowedEvent?: AlphabetEvent | null;
  policyLimitedEvent?: AlphabetEvent | null;
  policyReviewRequiredEvent?: AlphabetEvent | null;
  policyBlockedEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
