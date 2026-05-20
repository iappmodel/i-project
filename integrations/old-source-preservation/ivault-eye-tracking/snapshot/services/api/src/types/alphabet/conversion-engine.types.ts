import type { CoinBalanceState, CoinCode } from "./coin.types";
import type { CoinConversion, ConversionRule } from "./conversion.types";
import type { CoinLot, LedgerEntry } from "./wallet.types";

export interface ConversionExecutionContext {
  walletId: string;
  userId: string;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  availableSourceBalance: number;
  trustScore: number;
  trustTier: number;
  qualityScore: number;
  riskScore: number;
  ageBand: string;
  hasBudgetSource: boolean;
  now?: Date;
}

export interface ConversionExecutionResult {
  converted: boolean;
  reason?: string;
  rule?: ConversionRule;
  conversion?: CoinConversion;
  sourceDebitLedgerEntry?: LedgerEntry;
  targetCoinLot?: CoinLot;
  targetCreditLedgerEntry?: LedgerEntry;
  sourceCoin?: CoinCode;
  targetCoin?: CoinCode;
  sourceAmount?: number;
  targetAmount?: number;
  targetState?: CoinBalanceState;
}
