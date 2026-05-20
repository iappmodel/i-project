import type { AlphabetEvent } from "./event.types";

export type TreasuryReserveType =
  | "platform_reserve"
  | "liquidity_pool"
  | "campaign_budget"
  | "creator_payout_pool"
  | "grant_fund"
  | "withdrawal_pool"
  | "compliance_hold_pool"
  | "insurance_buffer"
  | "operational_budget";

export type TreasuryActionType =
  | "snapshot"
  | "allocate_reserve"
  | "release_reserve"
  | "approve_budget"
  | "reject_budget"
  | "lock_reserve"
  | "unlock_reserve"
  | "lock_liquidity"
  | "approve_grant_fund"
  | "reject_grant_fund"
  | "approve_campaign_budget"
  | "reject_campaign_budget";

export type TreasuryStatus =
  | "healthy"
  | "watch"
  | "constrained"
  | "reserve_locked"
  | "budget_blocked"
  | "liquidity_blocked"
  | "critical";

export type TreasuryAccountStatus =
  | "active"
  | "watch"
  | "constrained"
  | "locked"
  | "blocked"
  | "critical";

export interface TreasuryReserveAccount {
  treasuryAccountId: string;

  reserveType: TreasuryReserveType;
  coinCode: string;
  currencyCode: string;

  totalReserveBalance: number;
  allocatedBalance: number;
  availableBalance: number;
  lockedBalance: number;
  pendingObligationBalance: number;

  expectedInflows: number;
  expectedOutflows: number;

  status: TreasuryAccountStatus;

  createdAt: string;
  updatedAt: string;
}

export interface TreasurySignalInput {
  treasuryAccountId: string;

  reserveType: TreasuryReserveType;
  coinCode: string;
  currencyCode: string;

  actionType: TreasuryActionType;

  requestedAmount: number;

  totalReserveBalance: number;
  allocatedBalance: number;
  availableBalance: number;
  lockedBalance: number;
  pendingObligationBalance: number;

  expectedInflows: number;
  expectedOutflows: number;

  campaignBudgetCommitments: number;
  liquidityConversionObligations: number;
  withdrawalObligations: number;
  grantObligations: number;
  creatorPayoutObligations: number;
  refundChargebackExposure: number;

  reserveCoverageRatio: number;
  liquidityCoverageRatio: number;

  economyHealthScore: number;
  fraudPressureScore: number;
  rewardLeakageScore: number;
  anomalyScore: number;

  trustScore: number;
  riskScore: number;

  budgetOwnerId?: string | null;
  campaignId?: string | null;
  grantId?: string | null;
  businessId?: string | null;
  creatorId?: string | null;

  metadata?: Record<string, unknown>;
}

export interface TreasuryRuleSet {
  reserveType: TreasuryReserveType;

  minReserveCoverageRatio: number;
  minLiquidityCoverageRatio: number;
  minSolvencyScore: number;
  minBudgetHealthScore: number;

  maxTreasuryRiskScore: number;
  maxFraudPressureScore: number;
  maxRewardLeakageScore: number;
  maxAnomalyScore: number;

  maxAllocationRatio: number;
  maxPendingObligationRatio: number;
  maxExpectedOutflowRatio: number;
  maxRefundChargebackExposureRatio: number;

  allowBudgetApproval: boolean;
  allowLiquidityUse: boolean;
  allowGrantUse: boolean;
  allowCampaignUse: boolean;
  allowWithdrawalUse: boolean;

  requiresReviewAboveAmount: number;
  requiresAuditAboveAmount: number;

  active: boolean;
}

export interface TreasuryEvaluationResult {
  treasuryAccountId: string;

  reserveType: TreasuryReserveType;
  coinCode: string;
  currencyCode: string;

  status: TreasuryStatus;

  requestedAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  reservedAmount: number;
  releasedAmount: number;

  reserveCoverageRatio: number;
  liquidityCoverageRatio: number;
  solvencyScore: number;
  budgetHealthScore: number;
  treasuryRiskScore: number;

  budgetApproved: boolean;
  budgetRejected: boolean;
  reserveAllocated: boolean;
  reserveReleased: boolean;
  reserveLocked: boolean;
  liquidityLocked: boolean;
  reviewRecommended: boolean;
  auditRecommended: boolean;

  reasons: string[];

  treasurySnapshotCreatedEvent: AlphabetEvent;
  reserveAllocatedEvent?: AlphabetEvent | null;
  reserveReleasedEvent?: AlphabetEvent | null;
  budgetApprovedEvent?: AlphabetEvent | null;
  budgetRejectedEvent?: AlphabetEvent | null;
  liquidityPoolLockedEvent?: AlphabetEvent | null;
  treasuryRiskDetectedEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
