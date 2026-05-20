import { describe, expect, it } from "vitest";
import { computeBrandQuality } from "../pops-pricing-signal.service";
import { computeCampaignQuality } from "../pops-campaign-quality.service";
import { computeCreatorQuality } from "../pops-creator-quality.service";
import {
  POPS_PRICING_ENTITY_TYPE,
  POPS_PRICING_REASON_CODE,
  POPS_PRICING_RECOMMENDED_MULTIPLIER,
  type PopsPricingDateRange
} from "../pops-pricing.types";
import { recommendRewardMultiplier } from "../pops-reward-multiplier.service";
import {
  computeCostEfficiencyScore,
  computeFraudAdjustedQuality,
  PopsInMemoryPricingAggregateQuery,
  PopsPricingSignalService
} from "../pops-pricing-signal.service";

describe("P.O.P.S Stage 34 — campaign quality", () => {
  it("weights verified moments, attention, intent, completion, and low fraud", () => {
    const r = computeCampaignQuality({
      verifiedMomentRate: 1,
      averageAttentionConfidence: 1,
      averageIntentConfidence: 1,
      completionRate: 1,
      fraudRate: 0
    });
    expect(r.campaignQuality).toBeCloseTo(1, 5);
    expect(r.lowFraudRate).toBe(1);
  });

  it("matches the documented linear blend at interior point", () => {
    const r = computeCampaignQuality({
      verifiedMomentRate: 0.5,
      averageAttentionConfidence: 0.5,
      averageIntentConfidence: 0.5,
      completionRate: 0.5,
      fraudRate: 0.5
    });
    expect(r.campaignQuality).toBeCloseTo(0.5, 5);
  });
});

describe("P.O.P.S Stage 34 — creator quality", () => {
  it("blends completion, attention, save/follow, low audience fraud, rewatch", () => {
    const r = computeCreatorQuality({
      verifiedCompletionRate: 1,
      averageAttentionConfidence: 1,
      saveFollowIntentQuality: 1,
      audienceFraudRate: 0,
      rewatchReturnSignal: 1
    });
    expect(r.creatorQuality).toBeCloseTo(1, 5);
  });
});

describe("P.O.P.S Stage 34 — brand quality", () => {
  it("uses offer completion, low dispute, satisfaction, payout, low hold", () => {
    const r = computeBrandQuality({
      offerCompletionRate: 1,
      disputeRate: 0,
      userSatisfactionSignal: 1,
      payoutReliability: 1,
      holdRate: 0
    });
    expect(r.brandQuality).toBeCloseTo(1, 5);
  });
});

describe("P.O.P.S Stage 34 — reward multiplier", () => {
  it("recommends lower multiplier when fraud is high", () => {
    const clean = recommendRewardMultiplier({
      rates: {
        verifiedMomentRate: 0.9,
        averagePresenceConfidence: 0.85,
        averageAttentionConfidence: 0.88,
        averageIntentConfidence: 0.86,
        fraudRate: 0.05,
        holdRate: 0.05,
        denialRate: 0.04,
        completionRate: 0.92
      }
    });
    const dirty = recommendRewardMultiplier({
      rates: {
        verifiedMomentRate: 0.5,
        averagePresenceConfidence: 0.5,
        averageAttentionConfidence: 0.45,
        averageIntentConfidence: 0.4,
        fraudRate: 0.45,
        holdRate: 0.35,
        denialRate: 0.3,
        completionRate: 0.25
      }
    });
    expect(dirty.recommendedMultiplier).toBeLessThanOrEqual(clean.recommendedMultiplier);
    expect(dirty.reasonCodes).toContain(POPS_PRICING_REASON_CODE.HIGH_FRAUD_RATE);
    expect(clean.reasonCodes).toContain(POPS_PRICING_REASON_CODE.MARKETPLACE_APPROVAL_REQUIRED);
  });

  it("only returns allowed discrete multipliers", () => {
    const m = recommendRewardMultiplier({
      rates: {
        verifiedMomentRate: 0.7,
        averagePresenceConfidence: 0.7,
        averageAttentionConfidence: 0.7,
        averageIntentConfidence: 0.7,
        fraudRate: 0.1,
        holdRate: 0.1,
        denialRate: 0.1,
        completionRate: 0.7
      }
    }).recommendedMultiplier;
    expect([
      POPS_PRICING_RECOMMENDED_MULTIPLIER.HALF,
      POPS_PRICING_RECOMMENDED_MULTIPLIER.THREE_QUARTER,
      POPS_PRICING_RECOMMENDED_MULTIPLIER.NEUTRAL,
      POPS_PRICING_RECOMMENDED_MULTIPLIER.SLIGHT_PREMIUM,
      POPS_PRICING_RECOMMENDED_MULTIPLIER.PREMIUM,
      POPS_PRICING_RECOMMENDED_MULTIPLIER.HIGH_PREMIUM,
      POPS_PRICING_RECOMMENDED_MULTIPLIER.DOUBLE
    ]).toContain(m);
  });
});

describe("P.O.P.S Stage 34 — pricing signal aggregate service", () => {
  it("builds a signal from seeded aggregates without mutating economics", () => {
    const range: PopsPricingDateRange = { startMs: 0, endMs: 86_400_000 };
    const store = new PopsInMemoryPricingAggregateQuery();
    store.seed(POPS_PRICING_ENTITY_TYPE.CAMPAIGN, "cmp_1", range, {
      verifiedMomentRate: 0.8,
      averagePresenceConfidence: 0.78,
      averageAttentionConfidence: 0.8,
      averageIntentConfidence: 0.77,
      fraudRate: 0.08,
      holdRate: 0.06,
      denialRate: 0.05,
      completionRate: 0.9,
      spendMinor: 500_000
    });
    const svc = new PopsPricingSignalService(store);
    return svc
      .buildSignalForEntity(POPS_PRICING_ENTITY_TYPE.CAMPAIGN, "cmp_1", range, {
        creatorSignals: {
          verifiedCompletionRate: 0.85,
          averageAttentionConfidence: 0.82,
          saveFollowIntentQuality: 0.7,
          audienceFraudRate: 0.06,
          rewatchReturnSignal: 0.65
        },
        brandSignals: {
          offerCompletionRate: 0.9,
          disputeRate: 0.02,
          userSatisfactionSignal: 0.88,
          payoutReliability: 0.95,
          holdRate: 0.04
        }
      })
      .then((sig) => {
        expect(sig).not.toBeNull();
        expect(sig!.entityId).toBe("cmp_1");
        const rates = {
          verifiedMomentRate: 0.8,
          averagePresenceConfidence: 0.78,
          averageAttentionConfidence: 0.8,
          averageIntentConfidence: 0.77,
          fraudRate: 0.08,
          holdRate: 0.06,
          denialRate: 0.05,
          completionRate: 0.9,
          spendMinor: 500_000
        };
        expect(sig!.fraudAdjustedQuality).toBe(computeFraudAdjustedQuality(rates));
        expect(sig!.costEfficiencyScore).toBe(computeCostEfficiencyScore(rates));
        expect(typeof sig!.recommendedMultiplier).toBe("number");
        expect(sig!.reasonCodes.length).toBeGreaterThan(0);
      });
  });

  it("returns null when no aggregate exists", async () => {
    const store = new PopsInMemoryPricingAggregateQuery();
    const svc = new PopsPricingSignalService(store);
    const sig = await svc.buildSignalForEntity(
      POPS_PRICING_ENTITY_TYPE.BRAND,
      "missing",
      { startMs: 0, endMs: 1 }
    );
    expect(sig).toBeNull();
  });
});
