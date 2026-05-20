import type { CoinBalanceState, CoinCode } from "./coin.types";

export type WalletStatus =
  | "active"
  | "restricted"
  | "locked"
  | "under_review"
  | "closed";

export type CoinLotSourceType =
  | "attention"
  | "engagement"
  | "creation"
  | "learning"
  | "growth"
  | "help"
  | "safety"
  | "work"
  | "exchange"
  | "yield"
  | "presence"
  | "campaign"
  | "tip"
  | "admin_grant"
  | "conversion"
  | "refund"
  | "adjustment";

export interface Wallet {
  walletId: string;
  userId: string;
  walletStatus: WalletStatus;
  defaultCurrency: "iCoin" | "vCoin";
  createdAt: string;
  updatedAt: string;
}

export interface CoinAccount {
  coinAccountId: string;
  walletId: string;
  coinCode: CoinCode;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  restrictedBalance: number;
  identityBalance: number;
  scoreValue: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimeConvertedIn: number;
  lifetimeConvertedOut: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoinLot {
  lotId: string;
  walletId: string;
  coinCode: CoinCode;
  sourceEventId: string;
  sourceType: CoinLotSourceType;
  amountOriginal: number;
  amountRemaining: number;
  state: CoinBalanceState;
  spendRestriction?: string | null;
  ageRestriction?: string | null;
  expiresAt?: string | null;
  availableAt?: string | null;
  riskHoldUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LedgerDirection =
  | "credit"
  | "debit"
  | "lock"
  | "unlock"
  | "convert_in"
  | "convert_out"
  | "conversion_debit"
  | "conversion_credit"
  | "conversion_fee"
  | "withdrawal_hold"
  | "withdrawal_debit"
  | "withdrawal_fee"
  | "payout_completed"
  | "creator_payout_credit"
  | "creator_payout_reversal"
  | "grant_credit"
  | "grant_reversal"
  | "creator_platform_fee"
  | "creator_tax_withholding"
  | "withdrawal_reversal"
  | "revoke"
  | "expire"
  | "adjust";

export interface LedgerEntry {
  entryId: string;
  walletId: string;
  coinCode: CoinCode;
  lotId?: string | null;
  direction: LedgerDirection;
  amount: number;
  stateBefore?: CoinBalanceState | null;
  stateAfter?: CoinBalanceState | null;
  eventType: string;
  sourceEventId?: string | null;
  counterpartyId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
