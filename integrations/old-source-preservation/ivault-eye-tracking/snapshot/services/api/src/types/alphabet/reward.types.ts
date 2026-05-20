import type { CoinBalanceState, CoinCode } from "./coin.types";
import type { AlphabetEvent, AlphabetEventType } from "./event.types";
import type { CoinLot, CoinLotSourceType, LedgerEntry } from "./wallet.types";

export type RewardRuleStatus = "active" | "inactive" | "deprecated";

export type RewardIssueMode =
  | "wallet_lot"
  | "score_update"
  | "identity_update"
  | "access_update"
  | "blocked";

export interface RewardRule {
  rewardRuleId: string;
  eventType: AlphabetEventType;
  targetCoin: CoinCode;
  sourceType: CoinLotSourceType;
  issueMode: RewardIssueMode;
  baseAmount: number;
  minRawScore: number;
  minQualityScore: number;
  maxRiskScore: number;
  minTrustScore: number;
  minAgeBand?: string | null;
  defaultState: CoinBalanceState;
  pendingDurationHours: number;
  allowIfSystemOnly: boolean;
  requiresVerification: boolean;
  requiresBudgetSource: boolean;
  dailyUserCap?: number | null;
  lifetimeUserCap?: number | null;
  status: RewardRuleStatus;
}

export interface RewardIssuanceContext {
  event: AlphabetEvent;
  trustScore: number;
  trustTier: number;
  qualityScore: number;
  riskScore: number;
  ageBand: string;
  hasBudgetSource: boolean;
  now?: Date;
}

export interface RewardMultiplierSet {
  qualityMultiplier: number;
  trustMultiplier: number;
  riskMultiplier: number;
  ageMultiplier: number;
}

export interface RewardIssuanceResult {
  issued: boolean;
  reason?: string;
  event: AlphabetEvent;
  rule?: RewardRule;
  targetCoin?: CoinCode;
  baseAmount?: number;
  finalAmount?: number;
  multipliers?: RewardMultiplierSet;
  coinLot?: CoinLot;
  ledgerEntry?: LedgerEntry;
}
