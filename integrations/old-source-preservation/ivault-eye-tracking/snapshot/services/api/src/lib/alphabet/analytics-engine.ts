import { ANALYTICS_RULES } from "../../data/alphabet/analytics-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type { CoinCode } from "../../types/alphabet/coin.types";
import type {
  AnalyticsEvaluationResult,
  AnalyticsRuleSet,
  AnalyticsSignalInput,
  AnalyticsStatus
} from "../../types/alphabet/analytics.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: AnalyticsSignalInput): AnalyticsRuleSet | undefined {
  return ANALYTICS_RULES.find(
    (rule) => rule.active && rule.scope === input.scope
  );
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function calculateLiquidityHealthScore(input: AnalyticsSignalInput): number {
  const reserveCoverage = clamp(input.economyMetrics.reserveCoverageRatio / 2);
  const liquidityPressurePenalty = clamp(input.economyMetrics.liquidityPressureRatio);

  return clamp(reserveCoverage * 0.65 + (1 - liquidityPressurePenalty) * 0.35);
}

function calculateFraudPressureScore(input: AnalyticsSignalInput): number {
  const risk = input.riskMetrics;

  return clamp(
    risk.fraudRate * 2.5 * 0.18 +
      risk.suspiciousEventRate * 1.8 * 0.16 +
      risk.walletLockRate * 2 * 0.12 +
      risk.withdrawalHoldRate * 1.2 * 0.1 +
      risk.conversionRejectionRate * 0.9 * 0.1 +
      risk.gpsSpoofingRate * 2.2 * 0.12 +
      risk.identityRiskRate * 2.2 * 0.14 +
      risk.grantGamingRate * 3 * 0.08
  );
}

function calculateRewardLeakageScore(input: AnalyticsSignalInput): number {
  const issued = input.economyMetrics.totalIssued;
  const converted = input.economyMetrics.totalConverted;
  const withdrawn = input.economyMetrics.totalWithdrawn;

  const conversionPressure = safeRatio(converted, issued);
  const withdrawalPressure = safeRatio(withdrawn, issued);

  const lowQualityPenalty = 1 - clamp(input.qualityMetrics.averageQualityScore);
  const riskPenalty = clamp(input.qualityMetrics.averageRiskScore);

  const reversalPressure = clamp(input.behavioralMetrics.reversalRate);
  const appealPressure = clamp(input.behavioralMetrics.appealRate);

  return clamp(
    conversionPressure * 0.2 +
      withdrawalPressure * 0.25 +
      lowQualityPenalty * 0.18 +
      riskPenalty * 0.2 +
      reversalPressure * 0.1 +
      appealPressure * 0.07
  );
}

function calculateUserValueHealthScore(input: AnalyticsSignalInput): number {
  const q = input.qualityMetrics;
  const b = input.behavioralMetrics;

  return clamp(
    clamp(q.averageTrustScore / 100) * 0.2 +
      clamp(q.averageUValueScore / 100) * 0.2 +
      clamp(q.averageQualityScore) * 0.2 +
      clamp(b.completionRate) * 0.15 +
      clamp(b.verificationPassRate) * 0.15 +
      clamp(q.rewardEfficiency) * 0.1
  );
}

function calculateEconomyHealthScore(input: AnalyticsSignalInput): number {
  const liquidityHealthScore = calculateLiquidityHealthScore(input);
  const fraudPressureScore = calculateFraudPressureScore(input);
  const rewardLeakageScore = calculateRewardLeakageScore(input);
  const userValueHealthScore = calculateUserValueHealthScore(input);

  const reserveHealth =
    input.economyMetrics.reserveCoverageRatio >= 1
      ? clamp(input.economyMetrics.reserveCoverageRatio / 2)
      : clamp(input.economyMetrics.reserveCoverageRatio);

  const activityHealth =
    input.behavioralMetrics.activeEarners <= 0
      ? 0
      : clamp(
          input.behavioralMetrics.activeSpenders /
            Math.max(1, input.behavioralMetrics.activeEarners)
        );

  return clamp(
    liquidityHealthScore * 0.25 +
      userValueHealthScore * 0.25 +
      reserveHealth * 0.15 +
      activityHealth * 0.1 +
      (1 - fraudPressureScore) * 0.15 +
      (1 - rewardLeakageScore) * 0.1
  );
}

function calculateAnomalyScore(input: AnalyticsSignalInput): number {
  const volumeDelta =
    input.volumeBaseline <= 0
      ? 0
      : Math.abs(input.eventVolume - input.volumeBaseline) / input.volumeBaseline;

  const healthDelta = Math.abs(
    calculateEconomyHealthScore(input) - input.historicalEconomyHealthScore
  );

  const fraudDelta = Math.abs(
    calculateFraudPressureScore(input) - input.historicalFraudPressureScore
  );

  const liquidityDelta = Math.abs(
    input.economyMetrics.liquidityPressureRatio -
      input.historicalLiquidityPressureRatio
  );

  const leakageDelta = Math.abs(
    calculateRewardLeakageScore(input) - input.historicalRewardLeakageScore
  );

  return clamp(
    clamp(volumeDelta) * 0.5 +
      clamp(healthDelta) * 0.15 +
      clamp(fraudDelta) * 0.15 +
      clamp(liquidityDelta) * 0.1 +
      clamp(leakageDelta) * 0.1
  );
}

function decideAnalyticsStatus(params: {
  input: AnalyticsSignalInput;
  rule: AnalyticsRuleSet;
  economyHealthScore: number;
  liquidityHealthScore: number;
  fraudPressureScore: number;
  rewardLeakageScore: number;
  userValueHealthScore: number;
  anomalyScore: number;
  reasons: string[];
}): AnalyticsStatus {
  const {
    input,
    rule,
    economyHealthScore,
    liquidityHealthScore,
    fraudPressureScore,
    rewardLeakageScore,
    userValueHealthScore,
    anomalyScore,
    reasons
  } = params;

  if (input.economyMetrics.reserveCoverageRatio < rule.minReserveCoverageRatio) {
    reasons.push("reserve_coverage_below_minimum");
  }

  if (input.economyMetrics.liquidityPressureRatio > rule.maxLiquidityPressureRatio) {
    reasons.push("liquidity_pressure_above_maximum");
  }

  if (input.riskMetrics.fraudRate > rule.maxFraudRate) {
    reasons.push("fraud_rate_above_maximum");
  }

  if (input.riskMetrics.suspiciousEventRate > rule.maxSuspiciousEventRate) {
    reasons.push("suspicious_event_rate_above_maximum");
  }

  if (input.riskMetrics.walletLockRate > rule.maxWalletLockRate) {
    reasons.push("wallet_lock_rate_above_maximum");
  }

  if (input.riskMetrics.withdrawalHoldRate > rule.maxWithdrawalHoldRate) {
    reasons.push("withdrawal_hold_rate_above_maximum");
  }

  if (input.riskMetrics.conversionRejectionRate > rule.maxConversionRejectionRate) {
    reasons.push("conversion_rejection_rate_above_maximum");
  }

  if (input.riskMetrics.gpsSpoofingRate > rule.maxGpsSpoofingRate) {
    reasons.push("gps_spoofing_rate_above_maximum");
  }

  if (input.riskMetrics.identityRiskRate > rule.maxIdentityRiskRate) {
    reasons.push("identity_risk_rate_above_maximum");
  }

  if (input.riskMetrics.grantGamingRate > rule.maxGrantGamingRate) {
    reasons.push("grant_gaming_rate_above_maximum");
  }

  if (input.behavioralMetrics.appealRate > rule.maxAppealRate) {
    reasons.push("appeal_rate_above_maximum");
  }

  if (input.behavioralMetrics.reversalRate > rule.maxReversalRate) {
    reasons.push("reversal_rate_above_maximum");
  }

  if (economyHealthScore < rule.minEconomyHealthScore) {
    reasons.push("economy_health_below_minimum");
  }

  if (liquidityHealthScore < rule.minLiquidityHealthScore) {
    reasons.push("liquidity_health_below_minimum");
  }

  if (userValueHealthScore < rule.minUserValueHealthScore) {
    reasons.push("user_value_health_below_minimum");
  }

  if (fraudPressureScore > rule.maxFraudPressureScore) {
    reasons.push("fraud_pressure_above_maximum");
  }

  if (rewardLeakageScore > rule.maxRewardLeakageScore) {
    reasons.push("reward_leakage_above_maximum");
  }

  if (anomalyScore > rule.maxAnomalyScore) {
    reasons.push("anomaly_score_above_maximum");
  }

  const severeReasons = reasons.filter((reason) =>
    [
      "reserve_coverage_below_minimum",
      "fraud_pressure_above_maximum",
      "reward_leakage_above_maximum",
      "anomaly_score_above_maximum",
      "liquidity_pressure_above_maximum"
    ].includes(reason)
  );

  if (
    economyHealthScore < 0.35 ||
    liquidityHealthScore < 0.35 ||
    fraudPressureScore > 0.75 ||
    rewardLeakageScore > 0.75 ||
    anomalyScore > 0.85
  ) {
    reasons.push("critical_economy_condition");
    return "critical";
  }

  if (
    economyHealthScore < 0.5 ||
    liquidityHealthScore < 0.5 ||
    fraudPressureScore > 0.45 ||
    rewardLeakageScore > 0.45 ||
    input.riskMetrics.fraudRate > rule.maxFraudRate * 2 ||
    severeReasons.length >= 2
  ) {
    reasons.push("high_risk_economy_condition");
    return "high_risk";
  }

  if (reasons.length >= 2) {
    reasons.push("degraded_economy_condition");
    return "degraded";
  }

  if (reasons.length > 0) {
    reasons.push("watch_economy_condition");
    return "watch";
  }

  reasons.push("healthy");
  return "healthy";
}

function createAnalyticsAlphabetEvent(params: {
  input: AnalyticsSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: "system",
    coinCode: (params.input.coinCode ?? "J") as CoinCode,
    eventType: params.eventType,
    objectType: "analytics_snapshot",
    objectId: params.input.analyticsSnapshotId,
    sourceContext: "analytics",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand ?? "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      analyticsSnapshotId: params.input.analyticsSnapshotId,
      scope: params.input.scope,
      scopeId: params.input.scopeId ?? null,
      period: params.input.period,
      periodStart: params.input.periodStart,
      periodEnd: params.input.periodEnd,
      coinCode: params.input.coinCode ?? null,
      campaignId: params.input.campaignId ?? null,
      creatorId: params.input.creatorId ?? null,
      businessId: params.input.businessId ?? null,
      region: params.input.region ?? null,
      riskClusterId: params.input.riskClusterId ?? null,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateAnalyticsSnapshot(
  input: AnalyticsSignalInput
): AnalyticsEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const economyHealthScore = calculateEconomyHealthScore(input);
  const liquidityHealthScore = calculateLiquidityHealthScore(input);
  const fraudPressureScore = calculateFraudPressureScore(input);
  const rewardLeakageScore = calculateRewardLeakageScore(input);
  const userValueHealthScore = calculateUserValueHealthScore(input);
  const anomalyScore = calculateAnomalyScore(input);

  if (!rule) {
    reasons.push("no_active_analytics_rule");

    const analyticsSnapshotCreatedEvent = createAnalyticsAlphabetEvent({
      input,
      eventType: "analytics_snapshot_created",
      rawScore: economyHealthScore,
      qualityScore: userValueHealthScore,
      riskScore: anomalyScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      analyticsSnapshotId: input.analyticsSnapshotId,
      scope: input.scope,
      scopeId: input.scopeId ?? null,
      status: "critical",
      economyHealthScore,
      liquidityHealthScore,
      fraudPressureScore,
      rewardLeakageScore,
      userValueHealthScore,
      anomalyScore,
      riskAlert: true,
      liquidityAlert: true,
      rewardLeakageAlert: true,
      reviewRecommended: true,
      auditRecommended: true,
      reasons,
      analyticsSnapshotCreatedEvent,
      economyHealthUpdatedEvent: null,
      riskAnomalyDetectedEvent: null,
      liquidityPressureDetectedEvent: null,
      rewardLeakageDetectedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideAnalyticsStatus({
    input,
    rule,
    economyHealthScore,
    liquidityHealthScore,
    fraudPressureScore,
    rewardLeakageScore,
    userValueHealthScore,
    anomalyScore,
    reasons
  });

  const riskAlert =
    status === "high_risk" ||
    status === "critical" ||
    fraudPressureScore > rule.maxFraudPressureScore ||
    anomalyScore > rule.maxAnomalyScore;

  const liquidityAlert =
    liquidityHealthScore < rule.minLiquidityHealthScore ||
    input.economyMetrics.liquidityPressureRatio > rule.maxLiquidityPressureRatio ||
    input.economyMetrics.reserveCoverageRatio < rule.minReserveCoverageRatio;

  const rewardLeakageAlert = rewardLeakageScore > rule.maxRewardLeakageScore;

  const reviewRecommended =
    status === "degraded" ||
    status === "high_risk" ||
    status === "critical" ||
    riskAlert ||
    liquidityAlert ||
    rewardLeakageAlert;

  const auditRecommended =
    status === "high_risk" ||
    status === "critical" ||
    anomalyScore > rule.maxAnomalyScore;

  const verificationStatus =
    status === "healthy" || status === "watch" ? "verified" : "rejected";

  const analyticsSnapshotCreatedEvent = createAnalyticsAlphabetEvent({
    input,
    eventType: "analytics_snapshot_created",
    rawScore: economyHealthScore,
    qualityScore: userValueHealthScore,
    riskScore: anomalyScore,
    verificationStatus,
    metadata: {
      status,
      reasons
    }
  });

  const economyHealthUpdatedEvent = createAnalyticsAlphabetEvent({
    input,
    eventType: "economy_health_updated",
    rawScore: economyHealthScore,
    qualityScore: userValueHealthScore,
    riskScore: fraudPressureScore,
    verificationStatus,
    metadata: {
      status,
      economyHealthScore,
      liquidityHealthScore,
      fraudPressureScore,
      rewardLeakageScore,
      userValueHealthScore,
      anomalyScore,
      reasons
    }
  });

  const riskAnomalyDetectedEvent = riskAlert
    ? createAnalyticsAlphabetEvent({
        input,
        eventType: "risk_anomaly_detected",
        rawScore: anomalyScore,
        qualityScore: fraudPressureScore,
        riskScore: anomalyScore,
        verificationStatus: "rejected",
        metadata: {
          status,
          fraudPressureScore,
          anomalyScore,
          reasons
        }
      })
    : null;

  const liquidityPressureDetectedEvent = liquidityAlert
    ? createAnalyticsAlphabetEvent({
        input,
        eventType: "liquidity_pressure_detected",
        rawScore: liquidityHealthScore,
        qualityScore: economyHealthScore,
        riskScore: input.economyMetrics.liquidityPressureRatio,
        verificationStatus: "rejected",
        metadata: {
          status,
          reserveCoverageRatio: input.economyMetrics.reserveCoverageRatio,
          liquidityPressureRatio: input.economyMetrics.liquidityPressureRatio,
          reasons
        }
      })
    : null;

  const rewardLeakageDetectedEvent = rewardLeakageAlert
    ? createAnalyticsAlphabetEvent({
        input,
        eventType: "reward_leakage_detected",
        rawScore: rewardLeakageScore,
        qualityScore: economyHealthScore,
        riskScore: rewardLeakageScore,
        verificationStatus: "rejected",
        metadata: {
          status,
          rewardLeakageScore,
          reasons
        }
      })
    : null;

  return {
    analyticsSnapshotId: input.analyticsSnapshotId,
    scope: input.scope,
    scopeId: input.scopeId ?? null,
    status,
    economyHealthScore,
    liquidityHealthScore,
    fraudPressureScore,
    rewardLeakageScore,
    userValueHealthScore,
    anomalyScore,
    riskAlert,
    liquidityAlert,
    rewardLeakageAlert,
    reviewRecommended,
    auditRecommended,
    reasons,
    analyticsSnapshotCreatedEvent,
    economyHealthUpdatedEvent,
    riskAnomalyDetectedEvent,
    liquidityPressureDetectedEvent,
    rewardLeakageDetectedEvent,
    metadata: {
      ruleScope: rule.scope,
      ...input.metadata
    }
  };
}
