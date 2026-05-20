import { beforeEach, describe, expect, it } from "vitest";
import {
  createAnalyticsSnapshot,
  evaluateStoredAnalyticsSnapshot,
  getAnalyticsEvaluationResult,
  getAnalyticsSnapshot,
  listAnalyticsSnapshots,
  resetAnalyticsStoreForTests
} from "../analytics-store";

function economyMetrics() {
  return {
    totalIssued: 100000,
    totalPending: 10000,
    totalAvailable: 50000,
    totalConverted: 12000,
    totalWithdrawn: 6000,
    totalBurnedOrExpired: 2000,
    reserveCoverageRatio: 1.6,
    liquidityPressureRatio: 0.25
  };
}

function behavioralMetrics() {
  return {
    activeEarners: 10000,
    activeSpenders: 3500,
    activeCreators: 1200,
    activeCampaigns: 300,
    completionRate: 0.78,
    verificationPassRate: 0.86,
    appealRate: 0.03,
    reversalRate: 0.01
  };
}

function riskMetrics() {
  return {
    fraudRate: 0.01,
    suspiciousEventRate: 0.03,
    walletLockRate: 0.01,
    withdrawalHoldRate: 0.04,
    conversionRejectionRate: 0.08,
    gpsSpoofingRate: 0.005,
    identityRiskRate: 0.008,
    grantGamingRate: 0.002
  };
}

function qualityMetrics() {
  return {
    averageTrustScore: 72,
    averageUValueScore: 38,
    averageQualityScore: 0.78,
    averageRiskScore: 0.12,
    rewardEfficiency: 0.72,
    campaignRoi: 1.4,
    creatorPayoutEfficiency: 0.82
  };
}

describe("analytics-store", () => {
  beforeEach(() => {
    resetAnalyticsStoreForTests();
  });

  it("creates analytics snapshot", () => {
    const snapshot = createAnalyticsSnapshot({
      scope: "platform",
      scopeId: "platform",
      period: "daily",
      periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      economyMetrics: economyMetrics(),
      behavioralMetrics: behavioralMetrics(),
      riskMetrics: riskMetrics(),
      qualityMetrics: qualityMetrics()
    });

    expect(snapshot.analyticsSnapshotId).toBeTruthy();

    const stored = getAnalyticsSnapshot(snapshot.analyticsSnapshotId);
    expect(stored?.analyticsSnapshotId).toBe(snapshot.analyticsSnapshotId);
  });

  it("lists snapshots by scope", () => {
    createAnalyticsSnapshot({
      scope: "platform",
      scopeId: "platform",
      period: "daily",
      periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      economyMetrics: economyMetrics(),
      behavioralMetrics: behavioralMetrics(),
      riskMetrics: riskMetrics(),
      qualityMetrics: qualityMetrics()
    });

    createAnalyticsSnapshot({
      scope: "coin",
      scopeId: "W",
      coinCode: "W",
      period: "daily",
      periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      economyMetrics: economyMetrics(),
      behavioralMetrics: behavioralMetrics(),
      riskMetrics: riskMetrics(),
      qualityMetrics: qualityMetrics()
    });

    expect(listAnalyticsSnapshots({ scope: "platform" })).toHaveLength(1);
    expect(listAnalyticsSnapshots({ scope: "coin" })).toHaveLength(1);
  });

  it("evaluates stored analytics snapshot", () => {
    const snapshot = createAnalyticsSnapshot({
      scope: "platform",
      scopeId: "platform",
      period: "daily",
      periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      economyMetrics: economyMetrics(),
      behavioralMetrics: behavioralMetrics(),
      riskMetrics: riskMetrics(),
      qualityMetrics: qualityMetrics()
    });

    const result = evaluateStoredAnalyticsSnapshot({
      analyticsSnapshotId: snapshot.analyticsSnapshotId,
      historicalEconomyHealthScore: 0.75,
      historicalFraudPressureScore: 0.08,
      historicalLiquidityPressureRatio: 0.25,
      historicalRewardLeakageScore: 0.18,
      volumeBaseline: 100000,
      eventVolume: 105000
    });

    expect(["healthy", "watch"]).toContain(result.status);

    const storedResult = getAnalyticsEvaluationResult(snapshot.analyticsSnapshotId);
    expect(storedResult?.analyticsSnapshotId).toBe(snapshot.analyticsSnapshotId);

    const updated = getAnalyticsSnapshot(snapshot.analyticsSnapshotId);
    expect(updated?.economyHealthScore).toBeGreaterThan(0);
  });

  it("stores high risk result", () => {
    const metrics = riskMetrics();

    const snapshot = createAnalyticsSnapshot({
      scope: "platform",
      scopeId: "platform",
      period: "daily",
      periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      economyMetrics: economyMetrics(),
      behavioralMetrics: behavioralMetrics(),
      riskMetrics: {
        ...metrics,
        fraudRate: 0.2,
        suspiciousEventRate: 0.3
      },
      qualityMetrics: qualityMetrics()
    });

    const result = evaluateStoredAnalyticsSnapshot({
      analyticsSnapshotId: snapshot.analyticsSnapshotId,
      historicalEconomyHealthScore: 0.75,
      historicalFraudPressureScore: 0.08,
      historicalLiquidityPressureRatio: 0.25,
      historicalRewardLeakageScore: 0.18,
      volumeBaseline: 100000,
      eventVolume: 105000
    });

    expect(["high_risk", "critical", "degraded"]).toContain(result.status);

    const updated = getAnalyticsSnapshot(snapshot.analyticsSnapshotId);
    expect(updated?.status).toBe(result.status);
  });
});
