import type { CoinCode } from "./coin.types";

export type CampaignBudgetStatus =
  | "draft"
  | "funded"
  | "active"
  | "paused"
  | "exhausted"
  | "refunding"
  | "refunded"
  | "closed";

export type CampaignBudgetLedgerDirection =
  | "fund"
  | "reserve"
  | "commit"
  | "spend"
  | "release"
  | "refund"
  | "adjust"
  | "close";

export type CampaignRewardCurrency =
  | "I"
  | "V"
  | "A"
  | "E"
  | "W"
  | "L"
  | "G"
  | "H"
  | "C"
  | "O";

export interface CampaignBudgetPool {
  campaignBudgetId: string;
  campaignId: string;
  ownerId: string;
  rewardCoin: CampaignRewardCurrency;
  totalBudget: number;
  availableBudget: number;
  reservedBudget: number;
  committedBudget: number;
  spentBudget: number;
  refundedBudget: number;
  status: CampaignBudgetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignBudgetReservation {
  reservationId: string;
  campaignBudgetId: string;
  campaignId: string;
  userId: string;
  sourceEventId: string;
  rewardCoin: CampaignRewardCurrency;
  amount: number;
  status:
    | "reserved"
    | "committed"
    | "spent"
    | "released"
    | "expired"
    | "cancelled";
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignBudgetLedgerEntry {
  entryId: string;
  campaignBudgetId: string;
  campaignId: string;
  direction: CampaignBudgetLedgerDirection;
  rewardCoin: CoinCode;
  amount: number;
  reservationId?: string | null;
  sourceEventId?: string | null;
  userId?: string | null;
  before: {
    availableBudget: number;
    reservedBudget: number;
    committedBudget: number;
    spentBudget: number;
    refundedBudget: number;
  };
  after: {
    availableBudget: number;
    reservedBudget: number;
    committedBudget: number;
    spentBudget: number;
    refundedBudget: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateCampaignBudgetInput {
  campaignId: string;
  ownerId: string;
  rewardCoin: CampaignRewardCurrency;
  totalBudget: number;
}

export interface ReserveCampaignRewardInput {
  campaignBudget: CampaignBudgetPool;
  userId: string;
  sourceEventId: string;
  amount: number;
  reservationTtlMinutes?: number;
}

export interface CampaignBudgetOperationResult {
  success: boolean;
  reason?: string;
  campaignBudget?: CampaignBudgetPool;
  reservation?: CampaignBudgetReservation;
  ledgerEntry?: CampaignBudgetLedgerEntry;
}
