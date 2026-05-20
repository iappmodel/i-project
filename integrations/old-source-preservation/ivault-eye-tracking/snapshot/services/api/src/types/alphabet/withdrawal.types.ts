import type { AlphabetEvent } from "./event.types";

export type WithdrawalPayoutMethod =
  | "bank"
  | "card"
  | "paypal"
  | "stripe"
  | "crypto"
  | "gift_card"
  | "internal_credit"
  | "manual";

export type KycStatus =
  | "not_required"
  | "not_started"
  | "pending"
  | "verified"
  | "failed"
  | "expired";

export type TaxProfileStatus =
  | "not_required"
  | "missing"
  | "pending"
  | "verified"
  | "failed";

export type ComplianceStatus =
  | "clear"
  | "pending_review"
  | "blocked"
  | "sanctions_match"
  | "region_blocked"
  | "manual_review_required";

export type PaymentMethodVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "failed"
  | "restricted";

export type WithdrawalStatus =
  | "withdrawal_approved"
  | "withdrawal_pending_review"
  | "withdrawal_held"
  | "withdrawal_rejected"
  | "compliance_blocked"
  | "wallet_locked"
  | "suspicious";

export type WithdrawalRequestStatus =
  | "created"
  | "approved"
  | "pending_review"
  | "held"
  | "rejected"
  | "compliance_blocked"
  | "completed"
  | "wallet_locked"
  | "suspicious"
  | "cancelled";

export interface WithdrawalRequest {
  withdrawalRequestId: string;
  walletId: string;
  userId: string;
  sourceCoin: string;
  requestedAmount: number;
  payoutAmount: number;
  feeAmount: number;
  payoutMethod: WithdrawalPayoutMethod;
  region: string;
  countryCode: string;
  status: WithdrawalRequestStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface WithdrawalSignalInput {
  withdrawalRequestId: string;
  walletId: string;
  userId: string;
  sourceCoin: string;
  requestedAmount: number;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  payoutMethod: WithdrawalPayoutMethod;
  region: string;
  countryCode: string;
  ageBand: string;
  guardianApproved: boolean;
  kycStatus: KycStatus;
  taxProfileStatus: TaxProfileStatus;
  complianceStatus: ComplianceStatus;
  paymentMethodVerificationStatus: PaymentMethodVerificationStatus;
  trustScore: number;
  uValueScore: number;
  withdrawalVelocityScore: number;
  recentWithdrawalCount: number;
  recentWithdrawalAmount: number;
  chargebackRisk: number;
  fraudRisk: number;
  accountTakeoverRisk: number;
  moneyLaunderingRisk: number;
  payoutRailRisk: number;
  deviceIntegrityScore: number;
  recentPenaltyCount: number;
  recentSeverePenaltyCount: number;
  walletLocked: boolean;
  withdrawalsLocked: boolean;
  metadata?: Record<string, unknown>;
}

export interface WithdrawalRuleSet {
  payoutMethod: WithdrawalPayoutMethod;
  minAmount: number;
  maxAmount: number;
  feeRate: number;
  flatFee: number;
  minTrustScore: number;
  minUValueScore: number;
  minWithdrawalEligibilityScore: number;
  minComplianceScore: number;
  minPayoutSafetyScore: number;
  maxRiskScore: number;
  maxFraudRisk: number;
  maxChargebackRisk: number;
  maxAccountTakeoverRisk: number;
  maxMoneyLaunderingRisk: number;
  maxPayoutRailRisk: number;
  maxWithdrawalVelocityScore: number;
  maxRecentWithdrawalCount: number;
  maxRecentWithdrawalAmount: number;
  maxRecentPenaltyCount: number;
  maxRecentSeverePenaltyCount: number;
  requiresKyc: boolean;
  requiresTaxProfile: boolean;
  requiresVerifiedPaymentMethod: boolean;
  under13Allowed: boolean;
  teenAllowed: boolean;
  guardianRequiredForMinors: boolean;
  active: boolean;
}

export interface WithdrawalVerificationResult {
  withdrawalRequestId: string;
  walletId: string;
  userId: string;
  status: WithdrawalStatus;
  sourceCoin: string;
  requestedAmount: number;
  payoutAmount: number;
  feeAmount: number;
  withdrawalEligibilityScore: number;
  complianceScore: number;
  payoutSafetyScore: number;
  riskScore: number;
  reasons: string[];
  withdrawalRequestedEvent: AlphabetEvent;
  withdrawalApprovedEvent?: AlphabetEvent | null;
  withdrawalHeldEvent?: AlphabetEvent | null;
  withdrawalRejectedEvent?: AlphabetEvent | null;
  payoutCompletedEvent?: AlphabetEvent | null;
  complianceBlockedEvent?: AlphabetEvent | null;
  withdrawalFraudEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
