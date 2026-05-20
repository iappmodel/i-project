import type { AlphabetEvent } from "./event.types";
import type { CoinCode } from "./coin.types";

export type CoinBalanceState =
  | "available"
  | "pending"
  | "score"
  | "identity"
  | "locked"
  | "system";

export type ConversionStatus =
  | "quote_created"
  | "conversion_approved"
  | "conversion_pending"
  | "conversion_rejected"
  | "liquidity_unavailable"
  | "wallet_locked"
  | "suspicious";

export type ConversionQuoteStatus =
  | "created"
  | "approved"
  | "pending"
  | "completed"
  | "rejected"
  | "expired"
  | "cancelled"
  | "suspicious";

export interface ConversionQuote {
  conversionQuoteId: string;
  walletId: string;
  userId: string;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  targetAmount: number;
  conversionRate: number;
  conversionFeeRate: number;
  conversionFeeAmount: number;
  sourceState: CoinBalanceState;
  status: ConversionQuoteStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface ConversionSignalInput {
  conversionQuoteId: string;
  walletId: string;
  userId: string;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  sourceState: CoinBalanceState;
  availableSourceBalance: number;
  conversionRate: number;
  conversionFeeRate: number;
  trustScore: number;
  uValueScore: number;
  walletRiskScore: number;
  fraudRisk: number;
  chargebackRisk: number;
  sourceCoinAbuseRisk: number;
  conversionVelocityRisk: number;
  liquidityManipulationRisk: number;
  recentPenaltyCount: number;
  recentSeverePenaltyCount: number;
  withdrawalLocked: boolean;
  walletLocked: boolean;
  liquidityAvailableAmount: number;
  liquidityReserveRatio: number;
  ageBand: string;
  metadata?: Record<string, unknown>;
}

export interface ConversionRuleSet {
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  convertible: boolean;
  allowedSourceStates: CoinBalanceState[];
  minSourceAmount: number;
  maxSourceAmount: number;
  baseConversionRate: number;
  conversionFeeRate: number;
  minTrustScore: number;
  minUValueScore: number;
  minConversionEligibilityScore: number;
  minLiquidityScore: number;
  minValueScore: number;
  maxRiskScore: number;
  maxWalletRiskScore: number;
  maxFraudRisk: number;
  maxChargebackRisk: number;
  maxConversionVelocityRisk: number;
  maxRecentPenaltyCount: number;
  maxRecentSeverePenaltyCount: number;
  under13Allowed: boolean;
  teenAllowed: boolean;
  guardianRequiredForMinors: boolean;
  requiresLiquidityReserve: boolean;
  active: boolean;
}

export interface ConversionVerificationResult {
  conversionQuoteId: string;
  walletId: string;
  userId: string;
  status: ConversionStatus;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  targetAmount: number;
  conversionRate: number;
  conversionFeeRate: number;
  conversionFeeAmount: number;
  conversionEligibilityScore: number;
  liquidityScore: number;
  valueScore: number;
  riskScore: number;
  reasons: string[];
  quoteCreatedEvent: AlphabetEvent;
  liquidityReservedEvent?: AlphabetEvent | null;
  conversionApprovedEvent?: AlphabetEvent | null;
  conversionCompletedEvent?: AlphabetEvent | null;
  conversionRejectedEvent?: AlphabetEvent | null;
  liquidityReleasedEvent?: AlphabetEvent | null;
  conversionFraudEvent?: AlphabetEvent | null;
  vCoinEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}

// Backward-compatible legacy aliases used by older examples/utilities.
export type ConversionRule = ConversionRuleSet;

export interface CoinConversion {
  conversionId: string;
  userId: string;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  targetAmount: number;
  baseRate: number;
  qualityMultiplier: number;
  trustMultiplier: number;
  riskMultiplier: number;
  ageMultiplier: number;
  status: string;
  createdAt: string;
  settledAt?: string | null;
}

export interface ConversionContext {
  userId: string;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  trustTier: number;
  qualityScore: number;
  riskScore: number;
  ageBand: string;
  hasBudgetSource: boolean;
}
