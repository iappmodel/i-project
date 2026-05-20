import { describe, expect, it } from "vitest";
import { evaluateAnalyticsSnapshot } from "../analytics-engine";
import type { AnalyticsSignalInput } from "../../../types/alphabet/analytics.types";

function makeInput(
  overrides: Partial<AnalyticsSignalInput> = {}
): AnalyticsSignalInput {
  return {
    analyticsSnapshotId: crypto.randomUUID(),
    scope: "platform",
    scopeId: "platform",
    period: "daily",
    periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
    coinCode: null,
    campaignId: null,
    creatorId: null,
    businessId: null,
    region: null,
    ageBand: null,
    riskClusterId: null,
    economyMetrics: {
      totalIssued: 100000,
      totalPending: 10000,
      totalAvailable: 50000,
      totalConverted: 12000,
      totalWithdrawn: 6000,
      totalBurnedOrExpired: 2000,
      reserveCoverageRatio: 1.6,
      liquidityPressureRatio: 0.25
    },
    behavioralMetrics: {
      activeEarners: 10000,
      activeSpenders: 3500,
      activeCreators: 1200,
      activeCampaigns: 300,
      completionRate: 0.78,
      verificationPassRate: 0.86,
      appealRate: 0.03,
      reversalRate: 0.01
    },
    riskMetrics: {
      fraudRate: 0.01,
      suspiciousEventRate: 0.03,
      walletLockRate: 0.01,
      withdrawalHoldRate: 0.04,
      conversionRejectionRate: 0.08,
      gpsSpoofingRate: 0.005,
      identityRiskRate: 0.008,
      grantGamingRate: 0.002
    },
    qualityMetrics: {
      averageTrustScore: 72,
      averageUValueScore: 38,
      averageQualityScore: 0.78,
      averageRiskScore: 0.12,
      rewardEfficiency: 0.72,
      campaignRoi: 1.4,
      creatorPayoutEfficiency: 0.82
    },
    historicalEconomyHealthScore: 0.75,
    historicalFraudPressureScore: 0.08,
    historicalLiquidityPressureRatio: 0.25,
    historicalRewardLeakageScore: 0.18,
    volumeBaseline: 100000,
    eventVolume: 105000,
    metadata: {},
    ...overrides
  };
}

describe("analytics-engine", () => {
  it("marks healthy platform snapshot", () => {
    const result = evaluateAnalyticsSnapshot(makeInput());

    expect(["healthy", "watch"]).toContain(result.status);
    expect(result.economyHealthUpdatedEvent?.eventType).toBe("economy_health_updated");
    expect(result.riskAlert).toBe(false);
  });

  it("detects liquidity pressure", () => {
    const baseline = makeInput();
    const result = evaluateAnalyticsSnapshot(
      makeInput({
        economyMetrics: {
          ...baseline.economyMetrics,
          reserveCoverageRatio: 0.6,
          liquidityPressureRatio: 0.9
        }
      })
    );

    expect(["high_risk", "critical", "degraded"]).toContain(result.status);
    expect(result.liquidityAlert).toBe(true);
    expect(result.liquidityPressureDetectedEvent?.eventType).toBe(
      "liquidity_pressure_detected"
    );
  });

  it("detects fraud pressure", () => {
    const baseline = makeInput();
    const result = evaluateAnalyticsSnapshot(
      makeInput({
        riskMetrics: {
          ...baseline.riskMetrics,
          fraudRate: 0.2,
          suspiciousEventRate: 0.3,
          identityRiskRate: 0.2
        }
      })
    );

    expect(["high_risk", "critical"]).toContain(result.status);
    expect(result.riskAlert).toBe(true);
    expect(result.riskAnomalyDetectedEvent?.eventType).toBe(
      "risk_anomaly_detected"
    );
  });

  it("detects reward leakage", () => {
    const baseline = makeInput();
    const result = evaluateAnalyticsSnapshot(
      makeInput({
        economyMetrics: {
          ...baseline.economyMetrics,
          totalConverted: 80000,
          totalWithdrawn: 70000
        },
        qualityMetrics: {
          ...baseline.qualityMetrics,
          averageQualityScore: 0.3,
          averageRiskScore: 0.6
        }
      })
    );

    expect(result.rewardLeakageAlert).toBe(true);
    expect(result.rewardLeakageDetectedEvent?.eventType).toBe(
      "reward_leakage_detected"
    );
  });

  it("detects anomaly from event volume spike", () => {
    const result = evaluateAnalyticsSnapshot(
      makeInput({
        volumeBaseline: 100000,
        eventVolume: 400000
      })
    );

    expect(result.anomalyScore).toBeGreaterThan(0.45);
    expect(result.riskAlert).toBe(true);
  });

  it("marks degraded on high appeal and reversal rates", () => {
    const baseline = makeInput();
    const result = evaluateAnalyticsSnapshot(
      makeInput({
        behavioralMetrics: {
          ...baseline.behavioralMetrics,
          appealRate: 0.4,
          reversalRate: 0.2
        }
      })
    );

    expect(["degraded", "high_risk", "critical"]).toContain(result.status);
    expect(result.reasons).toContain("appeal_rate_above_maximum");
    expect(result.reasons).toContain("reversal_rate_above_maximum");
  });

  it("supports coin-level snapshot", () => {
    const result = evaluateAnalyticsSnapshot(
      makeInput({
        scope: "coin",
        scopeId: "W",
        coinCode: "W"
      })
    );

    expect(result.scope).toBe("coin");
    expect(result.scopeId).toBe("W");
  });
});
