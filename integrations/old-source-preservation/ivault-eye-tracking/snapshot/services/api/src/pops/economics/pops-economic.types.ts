import type { PopsRewardDecisionStatus } from "../rewards/pops-reward-decision.types";

/** Campaign-side ledger state for a reward / session line. */
export const POPS_BUDGET_STATUS = {
  RESERVED: "RESERVED",
  DEBITED_PENDING: "DEBITED_PENDING",
  DEBITED_RELEASED: "DEBITED_RELEASED",
  RELEASED_BACK_TO_CAMPAIGN: "RELEASED_BACK_TO_CAMPAIGN",
  FAILED: "FAILED",
  NOT_REQUIRED: "NOT_REQUIRED"
} as const;

export type PopsBudgetStatus = (typeof POPS_BUDGET_STATUS)[keyof typeof POPS_BUDGET_STATUS];

/** Wallet / payout side state reconciled to the decision. */
export const POPS_ECONOMIC_WALLET_STATUS = {
  NONE: "NONE",
  PENDING: "PENDING",
  HELD: "HELD",
  RELEASED: "RELEASED",
  DENIED: "DENIED",
  EXPIRED: "EXPIRED"
} as const;

export type PopsEconomicWalletStatus =
  (typeof POPS_ECONOMIC_WALLET_STATUS)[keyof typeof POPS_ECONOMIC_WALLET_STATUS];

export const POPS_RECONCILIATION_STATUS = {
  MATCHED: "MATCHED",
  PENDING_WALLET: "PENDING_WALLET",
  PENDING_BUDGET: "PENDING_BUDGET",
  AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
  MISSING_WALLET_INTENT: "MISSING_WALLET_INTENT",
  MISSING_BUDGET_RECORD: "MISSING_BUDGET_RECORD",
  DUPLICATE_REWARD: "DUPLICATE_REWARD",
  FAILED_REQUIRES_REVIEW: "FAILED_REQUIRES_REVIEW"
} as const;

export type PopsReconciliationStatus =
  (typeof POPS_RECONCILIATION_STATUS)[keyof typeof POPS_RECONCILIATION_STATUS];

/**
 * Immutable economic reconciliation row: ties reward decision, optional wallet intent,
 * optional campaign budget reserve, and reconciliation outcome.
 * Amounts are minor units (integer) per product money rules.
 */
export interface PopsEconomicRecord {
  id: string;
  sessionId: string;
  campaignId: string;
  userId: string;
  rewardDecisionId: string;
  walletIntentId: string | null;
  budgetReserveId: string | null;
  coinType: string;
  baseAmount: number;
  finalAmount: number;
  decisionStatus: PopsRewardDecisionStatus;
  budgetStatus: PopsBudgetStatus;
  walletStatus: PopsEconomicWalletStatus;
  reconciliationStatus: PopsReconciliationStatus;
  createdAt: string;
}

export interface PopsEconomicDateRange {
  /** Inclusive ISO8601 */
  start: string;
  /** Exclusive or inclusive per caller; reconciliation treats end as inclusive by day if no time component */
  end: string;
}

/** Campaign must be funded for budget rows to be required. */
export interface PopsCampaignFunding {
  campaignId: string;
  /** Total funded minor units available to the campaign */
  fundedMinor: number;
  /** When true, starting a rewardable flow should create a reserve row */
  requiresBudgetReservation: boolean;
  /**
   * If HELD rewards keep campaign-side reserve vs move to debited-held;
   * affects expected BudgetStatus for HELD + wallet HELD.
   */
  holdAccountingPolicy: "KEEP_RESERVED" | "DEBIT_ON_HOLD";
}

/** Persisted or in-memory campaign budget line. */
export interface PopsCampaignBudgetReservation {
  id: string;
  campaignId: string;
  sessionId: string | null;
  userId: string | null;
  rewardDecisionId: string | null;
  estimatedRewardMinor: number;
  debitedMinor: number;
  releasedBackMinor: number;
  /** Internal reserve lifecycle */
  reserveStatus:
    | "OPEN"
    | "DEBITED_PENDING"
    | "DEBITED_RELEASED"
    | "RELEASED_BACK"
    | "FAILED";
  createdAt: string;
  updatedAt: string | null;
}

/** Normalized wallet line for reconciliation (pending intent or hold). */
export interface PopsWalletIntentSnapshot {
  id: string;
  rewardDecisionId: string;
  sessionId: string;
  userId: string;
  campaignId: string;
  coinType: string;
  amountMinor: number;
  /** From wallet reward status or derived */
  lifecycle: "PENDING" | "HELD" | "RELEASED" | "DENIED" | "EXPIRED" | "NONE";
  releaseEligibleAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PopsEconomicReconciliationIssue {
  code: PopsReconciliationStatus | "HELD_EXPIRED_UNRESOLVED" | "DENIED_WITH_RELEASED_WALLET";
  message: string;
  rewardDecisionId?: string;
  sessionId?: string;
  campaignId?: string;
}

export interface PopsEconomicReconciliationRunResult {
  runId: string;
  range: PopsEconomicDateRange;
  records: PopsEconomicRecord[];
  issues: PopsEconomicReconciliationIssue[];
  matchedCount: number;
  failedCount: number;
  startedAt: string;
  finishedAt: string;
}

export interface PopsEconomicReconciliationOptions {
  /** Max time a HELD wallet intent may sit before flagged (default 7d). */
  holdMaxDurationMs?: number;
  now?: () => string;
}

export interface PopsBrandInvoiceExportRow {
  campaignId: string;
  dateRange: PopsEconomicDateRange;
  verifiedMoments: number;
  approvedFullCount: number;
  approvedPartialCount: number;
  heldCount: number;
  deniedCount: number;
  releasedRewardTotal: number;
  heldRewardTotal: number;
  /** Sum of denied / blocked amounts that never left campaign (estimate). */
  fraudPreventedEstimate: number;
  costPerVerifiedMoment: number | null;
  costPerVerifiedIntent: number | null;
}
