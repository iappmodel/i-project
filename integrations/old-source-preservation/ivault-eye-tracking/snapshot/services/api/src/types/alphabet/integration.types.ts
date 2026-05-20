import type { CoinCode } from "./coin.types";

export interface TrustIntegrationSnapshot {
  userId: string;
  trustScore: number;
  trustTier: number;
  identityScore: number;
  paymentRiskScore: number;
  safetyScore: number;
  reputationScore: number;
  updatedAt: string;
}

export interface UValueIntegrationSnapshot {
  userId: string;
  uValueScore: number;
  uValueTier: number;
  lifetimePositiveValue: number;
  lifetimeNegativeEvents: number;
  grantEligibility: boolean;
  surpriseRewardEligibility: boolean;
  updatedAt: string;
}

export interface CoinIntegrationImpact {
  coinCode: CoinCode;
  affectsUValue: boolean;
  affectsTrust: boolean;
  scoreDelta?: number;
  trustDelta?: number;
}

export interface ConversionGuardSnapshot {
  trustTier: number;
  qualityScore: number;
  riskScore: number;
  ageBand: string;
  hasBudgetSource: boolean;
}
