import type { AlphabetEvent } from "./event.types";

export type CreatorRevenueSource =
  | "campaign"
  | "subscription"
  | "tip"
  | "content_sale"
  | "course_sale"
  | "creator_boost"
  | "ad_share"
  | "marketplace_service"
  | "grant"
  | "manual_adjustment";

export type CreatorPayoutStatus =
  | "payout_created"
  | "payout_pending_hold"
  | "payout_approved"
  | "payout_rejected"
  | "payout_disputed"
  | "payout_reversed"
  | "payout_pool_unavailable"
  | "payout_suspicious";

export type CreatorPayoutRecordStatus =
  | "created"
  | "pending_hold"
  | "approved"
  | "rejected"
  | "disputed"
  | "reversed"
  | "completed"
  | "pool_unavailable"
  | "suspicious";

export type CreatorDisputeStatus =
  | "none"
  | "opened"
  | "under_review"
  | "resolved_creator_wins"
  | "resolved_creator_loses"
  | "chargeback"
  | "refunded";

export type CreatorContentSafetyStatus =
  | "clear"
  | "limited"
  | "pending_review"
  | "blocked"
  | "removed";

export interface CreatorSplitRecipient {
  recipientUserId: string;
  recipientWalletId?: string | null;
  role: "creator" | "collaborator" | "referrer" | "agency" | "platform";
  splitRate: number;
  splitAmount: number;
}

export interface CreatorPayoutRecord {
  creatorPayoutId: string;
  creatorId: string;
  userId: string;
  walletId: string;
  revenueSource: CreatorRevenueSource;
  sourceObjectId?: string | null;
  grossRevenue: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  taxWithholdingEstimate: number;
  creatorNetRevenue: number;
  distributableAmount: number;
  collaborators: CreatorSplitRecipient[];
  payoutHoldHours: number;
  holdUntil: string | null;
  disputeStatus: CreatorDisputeStatus;
  contentSafetyStatus: CreatorContentSafetyStatus;
  status: CreatorPayoutRecordStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
}

export interface CreatorPayoutSignalInput {
  creatorPayoutId: string;
  creatorId: string;
  userId: string;
  walletId: string;
  revenueSource: CreatorRevenueSource;
  sourceObjectId?: string | null;
  grossRevenue: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  taxWithholdingEstimate: number;
  creatorNetRevenue: number;
  distributableAmount: number;
  collaborators: CreatorSplitRecipient[];
  payoutHoldHours: number;
  holdExpired: boolean;
  disputeStatus: CreatorDisputeStatus;
  contentSafetyStatus: CreatorContentSafetyStatus;
  originalityScore: number;
  attributionConfidenceScore: number;
  contentQualityScore: number;
  audienceQualityScore: number;
  copyrightRisk: number;
  safetyRisk: number;
  fraudRisk: number;
  chargebackRisk: number;
  refundRisk: number;
  payoutVelocityRisk: number;
  trustScore: number;
  uValueScore: number;
  payoutPoolAvailableAmount: number;
  payoutPoolCoverageRatio: number;
  recentPenaltyCount: number;
  recentSeverePenaltyCount: number;
  creatorAccountLocked: boolean;
  payoutLocked: boolean;
  reversalRequested: boolean;
  completionRequested: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreatorPayoutRuleSet {
  revenueSource: CreatorRevenueSource;
  minGrossRevenue: number;
  maxGrossRevenue: number;
  platformFeeRate: number;
  defaultPayoutHoldHours: number;
  minPayoutEligibilityScore: number;
  minRevenueQualityScore: number;
  minSplitIntegrityScore: number;
  minTrustScore: number;
  minUValueScore: number;
  maxPayoutRiskScore: number;
  maxCopyrightRisk: number;
  maxSafetyRisk: number;
  maxFraudRisk: number;
  maxChargebackRisk: number;
  maxRefundRisk: number;
  maxPayoutVelocityRisk: number;
  maxRecentPenaltyCount: number;
  maxRecentSeverePenaltyCount: number;
  requiresOriginalityVerification: boolean;
  requiresAttribution: boolean;
  requiresPayoutPool: boolean;
  allowManualAdjustment: boolean;
  active: boolean;
}

export interface CreatorPayoutResult {
  creatorPayoutId: string;
  creatorId: string;
  userId: string;
  walletId: string;
  revenueSource: CreatorRevenueSource;
  status: CreatorPayoutStatus;
  grossRevenue: number;
  platformFeeAmount: number;
  taxWithholdingEstimate: number;
  creatorNetRevenue: number;
  distributableAmount: number;
  collaboratorSplits: CreatorSplitRecipient[];
  walletCreditAuthorized: boolean;
  payoutPoolReserved: boolean;
  holdRequired: boolean;
  disputeRequired: boolean;
  reversalRequired: boolean;
  reviewRecommended: boolean;
  auditRecommended: boolean;
  payoutEligibilityScore: number;
  revenueQualityScore: number;
  payoutRiskScore: number;
  splitIntegrityScore: number;
  reasons: string[];
  creatorPayoutCreatedEvent: AlphabetEvent;
  creatorRevenueAttributedEvent?: AlphabetEvent | null;
  creatorPayoutHeldEvent?: AlphabetEvent | null;
  creatorPayoutApprovedEvent?: AlphabetEvent | null;
  creatorPayoutRejectedEvent?: AlphabetEvent | null;
  creatorPayoutReversedEvent?: AlphabetEvent | null;
  creatorPayoutDisputedEvent?: AlphabetEvent | null;
  creatorPayoutCompletedEvent?: AlphabetEvent | null;
  creatorPayoutFraudDetectedEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
