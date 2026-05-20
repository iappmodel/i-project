import { describe, expect, it } from "vitest";
import {
  buildCreatorPopsAnalytics,
  computeCreatorPresenceQuality,
  getCreatorPopsAnalyticsMock,
  getCreatorQualityTier,
  type CreatorPopsContentAggregate,
} from "./creator-pops.service";

describe("creator-pops.service", () => {
  it("computes creator presence quality using the stage formula", () => {
    const result = computeCreatorPresenceQuality({
      verifiedCompletionRate: 0.8,
      averageAttentionConfidence: 0.7,
      averageIntentConfidence: 0.6,
      replaySaveSignal: 0.5,
      lowFraudTrafficScore: 0.9,
    });

    expect(result.score).toBeCloseTo(0.7, 5);
    expect(result.breakdown.verifiedCompletionRateContribution).toBeCloseTo(0.24, 5);
    expect(result.breakdown.averageAttentionConfidenceContribution).toBeCloseTo(0.175, 5);
    expect(result.breakdown.averageIntentConfidenceContribution).toBeCloseTo(0.12, 5);
    expect(result.breakdown.replaySaveSignalContribution).toBeCloseTo(0.075, 5);
    expect(result.breakdown.lowFraudTrafficScoreContribution).toBeCloseTo(0.09, 5);
  });

  it("maps quality tiers from score bands", () => {
    expect(getCreatorQualityTier(0.2)).toBe("Emerging");
    expect(getCreatorQualityTier(0.5)).toBe("Reliable");
    expect(getCreatorQualityTier(0.7)).toBe("Strong");
    expect(getCreatorQualityTier(0.82)).toBe("Premium");
    expect(getCreatorQualityTier(0.95)).toBe("Elite");
  });

  it("builds aggregate metrics from content-level data", () => {
    const content: CreatorPopsContentAggregate[] = [
      {
        contentId: "a",
        title: "A",
        verifiedMoments: 100,
        verifiedWatchTimeSeconds: 10_000,
        averageMomentConfidence: 0.8,
        attentionQualityScore: 0.7,
        intentActionScore: 0.6,
        saveFollowIntentQuality: 0.5,
        rewardApprovalRate: 0.8,
        rewardHoldRate: 0.1,
        verifiedCompletionRate: 0.75,
        replayRewatchQuality: 0.4,
        suspiciousTrafficRate: 0.2,
        trustAdjustedEngagementQuality: 0.7,
      },
      {
        contentId: "b",
        title: "B",
        verifiedMoments: 50,
        verifiedWatchTimeSeconds: 2_000,
        averageMomentConfidence: 0.9,
        attentionQualityScore: 0.8,
        intentActionScore: 0.7,
        saveFollowIntentQuality: 0.6,
        rewardApprovalRate: 0.7,
        rewardHoldRate: 0.2,
        verifiedCompletionRate: 0.65,
        replayRewatchQuality: 0.5,
        suspiciousTrafficRate: 0.1,
        trustAdjustedEngagementQuality: 0.8,
      },
    ];

    const result = buildCreatorPopsAnalytics("creator_1", content);
    expect(result.verifiedMoments).toBe(150);
    expect(result.verifiedWatchTimeSeconds).toBe(12_000);
    expect(result.rewardApprovalRate).toBeCloseTo((0.8 * 100 + 0.7 * 50) / 150, 6);
    expect(result.rewardHoldRate).toBeCloseTo((0.1 * 100 + 0.2 * 50) / 150, 6);
    expect(result.creatorPresenceQuality).toBeGreaterThan(0);
    expect(result.verifiedMomentsByContent).toHaveLength(2);
  });

  it("returns privacy-safe aggregate mock payload", () => {
    const result = getCreatorPopsAnalyticsMock();
    expect(result.verifiedMoments).toBeGreaterThan(0);
    expect(result.qualityTier).toBeDefined();
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/userId|face|biometric|sensor|fraudSignature|trustScore|receipt/i);
  });
});
