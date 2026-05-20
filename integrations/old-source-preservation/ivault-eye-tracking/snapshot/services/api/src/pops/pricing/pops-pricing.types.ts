/**
 * P.O.P.S Stage 34 — pricing signals (recommendations only; no automatic money movement).
 */

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export const POPS_PRICING_ENTITY_TYPE = {
  CAMPAIGN: "CAMPAIGN",
  CREATOR: "CREATOR",
  BRAND: "BRAND",
  CONTENT: "CONTENT",
  OFFER_CATEGORY: "OFFER_CATEGORY",
  USER_COHORT: "USER_COHORT"
} as const;

export type PopsPricingEntityType = (typeof POPS_PRICING_ENTITY_TYPE)[keyof typeof POPS_PRICING_ENTITY_TYPE];

export const POPS_PRICING_RECOMMENDED_MULTIPLIER = {
  HALF: 0.5,
  THREE_QUARTER: 0.75,
  NEUTRAL: 1.0,
  SLIGHT_PREMIUM: 1.1,
  PREMIUM: 1.25,
  HIGH_PREMIUM: 1.5,
  DOUBLE: 2.0
} as const;

export type PopsRecommendedMultiplier =
  (typeof POPS_PRICING_RECOMMENDED_MULTIPLIER)[keyof typeof POPS_PRICING_RECOMMENDED_MULTIPLIER];

export const POPS_PRICING_RECOMMENDED_MULTIPLIERS: readonly PopsRecommendedMultiplier[] = [
  POPS_PRICING_RECOMMENDED_MULTIPLIER.HALF,
  POPS_PRICING_RECOMMENDED_MULTIPLIER.THREE_QUARTER,
  POPS_PRICING_RECOMMENDED_MULTIPLIER.NEUTRAL,
  POPS_PRICING_RECOMMENDED_MULTIPLIER.SLIGHT_PREMIUM,
  POPS_PRICING_RECOMMENDED_MULTIPLIER.PREMIUM,
  POPS_PRICING_RECOMMENDED_MULTIPLIER.HIGH_PREMIUM,
  POPS_PRICING_RECOMMENDED_MULTIPLIER.DOUBLE
] as const;

export interface PopsPricingDateRange {
  /** Inclusive start, UTC epoch ms */
  startMs: number;
  /** Exclusive or inclusive end per store convention; here inclusive end ms */
  endMs: number;
}

export const POPS_PRICING_REASON_CODE = {
  HIGH_VERIFIED_ATTENTION: "HIGH_VERIFIED_ATTENTION",
  HIGH_FRAUD_RATE: "HIGH_FRAUD_RATE",
  HIGH_HOLD_RATE: "HIGH_HOLD_RATE",
  LOW_COMPLETION: "LOW_COMPLETION",
  HIGH_INTENT_QUALITY: "HIGH_INTENT_QUALITY",
  HIGH_CREATOR_QUALITY: "HIGH_CREATOR_QUALITY",
  HIGH_CAMPAIGN_QUALITY: "HIGH_CAMPAIGN_QUALITY",
  HIGH_BRAND_QUALITY: "HIGH_BRAND_QUALITY",
  COST_EFFICIENCY_STRONG: "COST_EFFICIENCY_STRONG",
  COST_EFFICIENCY_WEAK: "COST_EFFICIENCY_WEAK",
  MARKETPLACE_APPROVAL_REQUIRED: "MARKETPLACE_APPROVAL_REQUIRED"
} as const;

export type PopsPricingReasonCode = (typeof POPS_PRICING_REASON_CODE)[keyof typeof POPS_PRICING_REASON_CODE];

/** Full pricing signal row — recommendation only */
export interface PopsPricingSignal {
  entityType: PopsPricingEntityType;
  entityId: string;
  dateRange: PopsPricingDateRange;
  verifiedMomentRate: number;
  averagePresenceConfidence: number;
  averageAttentionConfidence: number;
  averageIntentConfidence: number;
  fraudAdjustedQuality: number;
  holdRate: number;
  denialRate: number;
  completionRate: number;
  costEfficiencyScore: number;
  recommendedMultiplier: PopsRecommendedMultiplier;
  reasonCodes: PopsPricingReasonCode[];
  createdAt: string;
}

/** Raw aggregate inputs for signal construction (0–1 rates unless noted) */
export interface PopsPricingAggregateRates {
  verifiedMomentRate: number;
  averagePresenceConfidence: number;
  averageAttentionConfidence: number;
  averageIntentConfidence: number;
  /** Fraction of sessions flagged / denied for fraud-ish reasons */
  fraudRate: number;
  holdRate: number;
  denialRate: number;
  completionRate: number;
  /** Optional spend proxy for cost efficiency (minor units or abstract index) */
  spendMinor?: number;
}

export interface PopsCampaignQualityInput {
  verifiedMomentRate: number;
  averageAttentionConfidence: number;
  averageIntentConfidence: number;
  completionRate: number;
  /** High when bad */
  fraudRate: number;
}

export interface PopsCampaignQualityResult {
  campaignQuality: number;
  lowFraudRate: number;
  components: {
    verifiedMomentRate: number;
    attention: number;
    intent: number;
    completion: number;
    lowFraud: number;
  };
}

export interface PopsCreatorQualityInput {
  verifiedCompletionRate: number;
  averageAttentionConfidence: number;
  saveFollowIntentQuality: number;
  audienceFraudRate: number;
  rewatchReturnSignal: number;
}

export interface PopsCreatorQualityResult {
  creatorQuality: number;
  lowFraudAudienceQuality: number;
  components: {
    verifiedCompletion: number;
    attention: number;
    saveFollow: number;
    lowFraudAudience: number;
    rewatchReturn: number;
  };
}

export interface PopsBrandQualityInput {
  offerCompletionRate: number;
  disputeRate: number;
  userSatisfactionSignal: number;
  payoutReliability: number;
  holdRate: number;
}

export interface PopsBrandQualityResult {
  brandQuality: number;
  lowDisputeRate: number;
  lowHoldRate: number;
  components: {
    offerCompletion: number;
    lowDispute: number;
    satisfaction: number;
    payout: number;
    lowHold: number;
  };
}

/**
 * Port for loading aggregates (DB, warehouse, or in-memory demo store).
 * Implementations must not mutate wallet or campaign budgets.
 */
export interface PopsPricingAggregateQuery {
  getRatesForEntity(
    entityType: PopsPricingEntityType,
    entityId: string,
    range: PopsPricingDateRange
  ): Promise<PopsPricingAggregateRates | null>;
}
