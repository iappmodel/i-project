import {
  clamp01,
  POPS_PRICING_REASON_CODE,
  POPS_PRICING_RECOMMENDED_MULTIPLIERS,
  type PopsCampaignQualityResult,
  type PopsCreatorQualityResult,
  type PopsBrandQualityResult,
  type PopsPricingAggregateRates,
  type PopsPricingReasonCode,
  type PopsRecommendedMultiplier
} from "./pops-pricing.types";

export interface PopsRewardMultiplierInput {
  rates: PopsPricingAggregateRates;
  campaignQuality?: PopsCampaignQualityResult;
  creatorQuality?: PopsCreatorQualityResult;
  brandQuality?: PopsBrandQualityResult;
  /** Optional cost efficiency (e.g. verified-moment yield), 0–1 */
  costEfficiencyScore?: number;
  /** Optional entity hint for premium inventory path */
  entityIsPremiumCreator?: boolean;
}

export interface PopsRewardMultiplierResult {
  recommendedMultiplier: PopsRecommendedMultiplier;
  reasonCodes: PopsPricingReasonCode[];
}

function nearestMultiplier(target: number): PopsRecommendedMultiplier {
  const allowed = POPS_PRICING_RECOMMENDED_MULTIPLIERS as unknown as number[];
  let best = allowed[0]!;
  let bestDist = Math.abs(target - best);
  for (const m of allowed) {
    const d = Math.abs(target - m);
    if (d < bestDist || (d === bestDist && m > best)) {
      best = m;
      bestDist = d;
    }
  }
  return best as PopsRecommendedMultiplier;
}

/**
 * Maps verification posture to a discrete multiplier recommendation.
 * Does not change balances — marketplace must approve any economics change.
 */
export function recommendRewardMultiplier(input: PopsRewardMultiplierInput): PopsRewardMultiplierResult {
  const r = input.rates;
  const fraud = clamp01(r.fraudRate);
  const hold = clamp01(r.holdRate);
  const deny = clamp01(r.denialRate);
  const vmr = clamp01(r.verifiedMomentRate);
  const att = clamp01(r.averageAttentionConfidence);
  const intent = clamp01(r.averageIntentConfidence);
  const comp = clamp01(r.completionRate);

  const reasonCodes: PopsPricingReasonCode[] = [POPS_PRICING_REASON_CODE.MARKETPLACE_APPROVAL_REQUIRED];

  let score = 1.0;

  if (vmr >= 0.75 && att >= 0.72) {
    score += 0.35;
    reasonCodes.push(POPS_PRICING_REASON_CODE.HIGH_VERIFIED_ATTENTION);
  }

  if (intent >= 0.78) {
    score += 0.2;
    reasonCodes.push(POPS_PRICING_REASON_CODE.HIGH_INTENT_QUALITY);
  }

  if (fraud >= 0.22) {
    score -= 0.55;
    reasonCodes.push(POPS_PRICING_REASON_CODE.HIGH_FRAUD_RATE);
  }

  if (hold >= 0.18) {
    score -= 0.15;
    reasonCodes.push(POPS_PRICING_REASON_CODE.HIGH_HOLD_RATE);
  }

  if (comp < 0.45) {
    score -= 0.2;
    reasonCodes.push(POPS_PRICING_REASON_CODE.LOW_COMPLETION);
  }

  if (deny >= 0.2) {
    score -= 0.1;
  }

  const cq = input.campaignQuality?.campaignQuality;
  if (cq !== undefined && cq >= 0.82) {
    score += 0.15;
    reasonCodes.push(POPS_PRICING_REASON_CODE.HIGH_CAMPAIGN_QUALITY);
  }

  const crq = input.creatorQuality?.creatorQuality;
  if (crq !== undefined && crq >= 0.8) {
    score += 0.2;
    reasonCodes.push(POPS_PRICING_REASON_CODE.HIGH_CREATOR_QUALITY);
  }

  if (input.entityIsPremiumCreator && crq !== undefined && crq >= 0.75) {
    score += 0.1;
  }

  const bq = input.brandQuality?.brandQuality;
  if (bq !== undefined && bq >= 0.85) {
    score += 0.1;
    reasonCodes.push(POPS_PRICING_REASON_CODE.HIGH_BRAND_QUALITY);
  }

  if (input.costEfficiencyScore !== undefined) {
    const c = clamp01(input.costEfficiencyScore);
    if (c >= 0.72) {
      score += 0.08;
      reasonCodes.push(POPS_PRICING_REASON_CODE.COST_EFFICIENCY_STRONG);
    } else if (c <= 0.28) {
      score -= 0.08;
      reasonCodes.push(POPS_PRICING_REASON_CODE.COST_EFFICIENCY_WEAK);
    }
  }

  const recommendedMultiplier = nearestMultiplier(score);

  const unique = [...new Set(reasonCodes)];
  return { recommendedMultiplier, reasonCodes: unique };
}

export class PopsRewardMultiplierService {
  recommend(input: PopsRewardMultiplierInput): PopsRewardMultiplierResult {
    return recommendRewardMultiplier(input);
  }
}
