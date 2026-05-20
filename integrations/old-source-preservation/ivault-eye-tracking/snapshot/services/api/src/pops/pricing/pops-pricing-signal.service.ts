import { computeCampaignQuality } from "./pops-campaign-quality.service";
import { computeCreatorQuality } from "./pops-creator-quality.service";
import { recommendRewardMultiplier } from "./pops-reward-multiplier.service";
import {
  clamp01,
  type PopsBrandQualityInput,
  type PopsBrandQualityResult,
  type PopsCampaignQualityInput,
  type PopsCreatorQualityInput,
  type PopsPricingAggregateQuery,
  type PopsPricingAggregateRates,
  type PopsPricingDateRange,
  type PopsPricingEntityType,
  type PopsPricingSignal
} from "./pops-pricing.types";

const BRAND_W_OFFER = 0.25;
const BRAND_W_DISPUTE = 0.2;
const BRAND_W_SAT = 0.2;
const BRAND_W_PAYOUT = 0.2;
const BRAND_W_HOLD = 0.15;

/**
 * brandQuality =
 *   offerCompletionRate * 0.25
 * + lowDisputeRate * 0.20
 * + userSatisfactionSignal * 0.20
 * + payoutReliability * 0.20
 * + lowHoldRate * 0.15
 */
export function computeBrandQuality(input: PopsBrandQualityInput): PopsBrandQualityResult {
  const offer = clamp01(input.offerCompletionRate);
  const dispute = clamp01(input.disputeRate);
  const lowDisputeRate = clamp01(1 - dispute);
  const sat = clamp01(input.userSatisfactionSignal);
  const payout = clamp01(input.payoutReliability);
  const hold = clamp01(input.holdRate);
  const lowHoldRate = clamp01(1 - hold);

  const brandQuality = clamp01(
    offer * BRAND_W_OFFER +
      lowDisputeRate * BRAND_W_DISPUTE +
      sat * BRAND_W_SAT +
      payout * BRAND_W_PAYOUT +
      lowHoldRate * BRAND_W_HOLD
  );

  return {
    brandQuality,
    lowDisputeRate,
    lowHoldRate,
    components: {
      offerCompletion: offer * BRAND_W_OFFER,
      lowDispute: lowDisputeRate * BRAND_W_DISPUTE,
      satisfaction: sat * BRAND_W_SAT,
      payout: payout * BRAND_W_PAYOUT,
      lowHold: lowHoldRate * BRAND_W_HOLD
    }
  };
}

export class PopsBrandQualityService {
  compute(input: PopsBrandQualityInput): PopsBrandQualityResult {
    return computeBrandQuality(input);
  }
}

export function computeFraudAdjustedQuality(rates: PopsPricingAggregateRates): number {
  const base =
    (clamp01(rates.averagePresenceConfidence) +
      clamp01(rates.averageAttentionConfidence) +
      clamp01(rates.averageIntentConfidence)) /
    3;
  const fraudPenalty = Math.min(1, clamp01(rates.fraudRate) * 1.5);
  return clamp01(base * (1 - fraudPenalty));
}

/**
 * Higher when verified moments are cheap vs spend proxy (demo-normalized).
 */
export function computeCostEfficiencyScore(rates: PopsPricingAggregateRates): number {
  const vmr = clamp01(rates.verifiedMomentRate);
  const comp = clamp01(rates.completionRate);
  const hold = clamp01(rates.holdRate);
  const deny = clamp01(rates.denialRate);
  const spend = rates.spendMinor;
  if (spend === undefined || spend <= 0) {
    return clamp01(vmr * comp * (1 - hold) * (1 - deny));
  }
  const spendNorm = spend / 1_000_000;
  const raw = vmr / Math.max(spendNorm, 1e-6);
  return clamp01(raw / 10);
}

export interface PopsPricingSignalBuildOptions {
  /** When set, feeds brand / creator / campaign quality into multiplier reasons */
  creatorSignals?: PopsCreatorQualityInput;
  brandSignals?: PopsBrandQualityInput;
  entityIsPremiumCreator?: boolean;
}

export class PopsPricingSignalService {
  constructor(private readonly aggregateQuery: PopsPricingAggregateQuery) {}

  /**
   * Loads aggregate verification rates and emits a pricing signal (recommendation only).
   */
  async buildSignalForEntity(
    entityType: PopsPricingEntityType,
    entityId: string,
    dateRange: PopsPricingDateRange,
    options: PopsPricingSignalBuildOptions = {}
  ): Promise<PopsPricingSignal | null> {
    const rates = await this.aggregateQuery.getRatesForEntity(entityType, entityId, dateRange);
    if (!rates) return null;
    return this.buildSignalFromRates(entityType, entityId, dateRange, rates, options);
  }

  buildSignalFromRates(
    entityType: PopsPricingEntityType,
    entityId: string,
    dateRange: PopsPricingDateRange,
    rates: PopsPricingAggregateRates,
    options: PopsPricingSignalBuildOptions = {}
  ): PopsPricingSignal {
    const fraudAdjustedQuality = computeFraudAdjustedQuality(rates);
    const costEfficiencyScore = computeCostEfficiencyScore(rates);

    const campaignInput: PopsCampaignQualityInput = {
      verifiedMomentRate: rates.verifiedMomentRate,
      averageAttentionConfidence: rates.averageAttentionConfidence,
      averageIntentConfidence: rates.averageIntentConfidence,
      completionRate: rates.completionRate,
      fraudRate: rates.fraudRate
    };
    const campaignQuality = computeCampaignQuality(campaignInput);

    const creatorQuality = options.creatorSignals
      ? computeCreatorQuality(options.creatorSignals)
      : undefined;
    const brandQuality = options.brandSignals ? computeBrandQuality(options.brandSignals) : undefined;

    const mult = recommendRewardMultiplier({
      rates,
      campaignQuality,
      creatorQuality,
      brandQuality,
      costEfficiencyScore,
      entityIsPremiumCreator: options.entityIsPremiumCreator
    });

    return {
      entityType,
      entityId,
      dateRange,
      verifiedMomentRate: clamp01(rates.verifiedMomentRate),
      averagePresenceConfidence: clamp01(rates.averagePresenceConfidence),
      averageAttentionConfidence: clamp01(rates.averageAttentionConfidence),
      averageIntentConfidence: clamp01(rates.averageIntentConfidence),
      fraudAdjustedQuality,
      holdRate: clamp01(rates.holdRate),
      denialRate: clamp01(rates.denialRate),
      completionRate: clamp01(rates.completionRate),
      costEfficiencyScore,
      recommendedMultiplier: mult.recommendedMultiplier,
      reasonCodes: mult.reasonCodes,
      createdAt: new Date().toISOString()
    };
  }
}

/** Demo / dev in-memory aggregate store — no I/O */
export class PopsInMemoryPricingAggregateQuery implements PopsPricingAggregateQuery {
  private readonly store = new Map<string, PopsPricingAggregateRates>();

  private key(entityType: PopsPricingEntityType, entityId: string, range: PopsPricingDateRange): string {
    return `${entityType}:${entityId}:${range.startMs}:${range.endMs}`;
  }

  seed(
    entityType: PopsPricingEntityType,
    entityId: string,
    range: PopsPricingDateRange,
    rates: PopsPricingAggregateRates
  ): void {
    this.store.set(this.key(entityType, entityId, range), rates);
  }

  async getRatesForEntity(
    entityType: PopsPricingEntityType,
    entityId: string,
    range: PopsPricingDateRange
  ): Promise<PopsPricingAggregateRates | null> {
    return this.store.get(this.key(entityType, entityId, range)) ?? null;
  }
}
