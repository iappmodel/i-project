import type { AnalyticsEvaluationResult } from "../../types/alphabet/analytics.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromAnalyticsEvaluation(
  result: AnalyticsEvaluationResult
): TrustImpactEvent | null {
  if (result.status === "healthy") {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "economy_health_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId: result.economyHealthUpdatedEvent?.eventId ?? null,
      confidence: 0.6,
      metadata: {
        analyticsSnapshotId: result.analyticsSnapshotId,
        scope: result.scope,
        scopeId: result.scopeId ?? null,
        economyHealthScore: result.economyHealthScore,
        liquidityHealthScore: result.liquidityHealthScore
      }
    });
  }

  if (result.riskAlert) {
    return createTrustImpactEvent({
      userId: "system",
      eventType: "economy_risk_anomaly_detected",
      category: "safety",
      severity:
        result.status === "critical" || result.status === "high_risk"
          ? "negative_large"
          : "negative_medium",
      sourceEventId:
        result.riskAnomalyDetectedEvent?.eventId ??
        result.economyHealthUpdatedEvent?.eventId ??
        null,
      confidence: 0.8,
      metadata: {
        analyticsSnapshotId: result.analyticsSnapshotId,
        scope: result.scope,
        scopeId: result.scopeId ?? null,
        status: result.status,
        reasons: result.reasons,
        fraudPressureScore: result.fraudPressureScore,
        anomalyScore: result.anomalyScore
      }
    });
  }

  return null;
}

export function createUValueEventFromAnalyticsEvaluation(
  result: AnalyticsEvaluationResult
): UValueImpactEvent | null {
  if (result.rewardLeakageAlert) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "reward_leakage_detected",
      category: "economic",
      severity: "negative_large",
      coinCode: "J",
      sourceEventId: result.rewardLeakageDetectedEvent?.eventId ?? null,
      confidence: 0.8,
      metadata: {
        analyticsSnapshotId: result.analyticsSnapshotId,
        scope: result.scope,
        scopeId: result.scopeId ?? null,
        status: result.status,
        reasons: result.reasons,
        rewardLeakageScore: result.rewardLeakageScore
      }
    });
  }

  if (result.liquidityAlert) {
    return createUValueImpactEvent({
      userId: "system",
      eventType: "liquidity_pressure_detected",
      category: "economic",
      severity: "negative_medium",
      coinCode: "J",
      sourceEventId: result.liquidityPressureDetectedEvent?.eventId ?? null,
      confidence: 0.75,
      metadata: {
        analyticsSnapshotId: result.analyticsSnapshotId,
        scope: result.scope,
        scopeId: result.scopeId ?? null,
        status: result.status,
        reasons: result.reasons,
        liquidityHealthScore: result.liquidityHealthScore
      }
    });
  }

  return null;
}
