import {
  createAnalyticsSnapshot,
  evaluateStoredAnalyticsSnapshot
} from "./analytics-store";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  createTrustEventFromAnalyticsEvaluation,
  createUValueEventFromAnalyticsEvaluation
} from "./analytics-event-factory";

const snapshot = createAnalyticsSnapshot({
  scope: "platform",
  scopeId: "platform",
  period: "daily",
  periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  periodEnd: new Date().toISOString(),
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
  }
});

const analyticsResult = evaluateStoredAnalyticsSnapshot({
  analyticsSnapshotId: snapshot.analyticsSnapshotId,
  historicalEconomyHealthScore: 0.75,
  historicalFraudPressureScore: 0.08,
  historicalLiquidityPressureRatio: 0.25,
  historicalRewardLeakageScore: 0.18,
  volumeBaseline: 100000,
  eventVolume: 105000
});

const trustEvent = createTrustEventFromAnalyticsEvaluation(analyticsResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromAnalyticsEvaluation(analyticsResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

/**
 * Production use:
 * if analyticsResult.reviewRecommended:
 * - create admin review case
 *
 * if analyticsResult.auditRecommended:
 * - create audit record
 *
 * if analyticsResult.liquidityAlert:
 * - notify treasury/liquidity admin
 *
 * if analyticsResult.rewardLeakageAlert:
 * - pause suspicious campaign/coin rules through review, not directly here
 */

console.log("Analytics:");
console.log(JSON.stringify(analyticsResult, null, 2));

console.log("System Trust:");
console.log(JSON.stringify(getOrCreateTrustScore("system"), null, 2));

console.log("System U Value:");
console.log(JSON.stringify(getOrCreateUValueState("system"), null, 2));
