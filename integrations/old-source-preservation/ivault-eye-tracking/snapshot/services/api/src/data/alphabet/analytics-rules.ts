import type { AnalyticsRuleSet } from "../../types/alphabet/analytics.types";

const strictScopes = new Set([
  "platform",
  "coin",
  "campaign",
  "region",
  "risk_cluster"
]);

export const ANALYTICS_RULES: AnalyticsRuleSet[] = [
  "platform",
  "coin",
  "user_segment",
  "campaign",
  "creator",
  "business",
  "region",
  "age_band",
  "risk_cluster"
].map((scope) => {
  const strict = strictScopes.has(scope);

  return {
    scope: scope as AnalyticsRuleSet["scope"],
    minEconomyHealthScore: strict ? 0.7 : 0.6,
    minLiquidityHealthScore: strict ? 0.7 : 0.6,
    minUserValueHealthScore: strict ? 0.6 : 0.5,
    maxFraudPressureScore: strict ? 0.3 : 0.4,
    maxRewardLeakageScore: strict ? 0.25 : 0.35,
    maxAnomalyScore: strict ? 0.45 : 0.55,
    maxLiquidityPressureRatio: strict ? 0.65 : 0.75,
    minReserveCoverageRatio: strict ? 1.1 : 1.0,
    maxFraudRate: strict ? 0.04 : 0.06,
    maxSuspiciousEventRate: strict ? 0.08 : 0.12,
    maxWalletLockRate: strict ? 0.05 : 0.08,
    maxWithdrawalHoldRate: strict ? 0.12 : 0.18,
    maxConversionRejectionRate: strict ? 0.18 : 0.25,
    maxGpsSpoofingRate: strict ? 0.04 : 0.06,
    maxIdentityRiskRate: strict ? 0.05 : 0.08,
    maxGrantGamingRate: strict ? 0.025 : 0.04,
    maxAppealRate: strict ? 0.12 : 0.18,
    maxReversalRate: strict ? 0.05 : 0.08,
    active: true
  };
});
