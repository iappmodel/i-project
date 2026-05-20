import type { AlphabetEvent } from "./event.types";

export type AnalyticsScope =
  | "platform"
  | "coin"
  | "user_segment"
  | "campaign"
  | "creator"
  | "business"
  | "region"
  | "age_band"
  | "risk_cluster";

export type AnalyticsPeriod =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "lifetime";

export type AnalyticsStatus =
  | "healthy"
  | "watch"
  | "degraded"
  | "high_risk"
  | "critical";

export interface EconomyMetrics {
  totalIssued: number;
  totalPending: number;
  totalAvailable: number;
  totalConverted: number;
  totalWithdrawn: number;
  totalBurnedOrExpired: number;
  reserveCoverageRatio: number;
  liquidityPressureRatio: number;
}

export interface BehavioralMetrics {
  activeEarners: number;
  activeSpenders: number;
  activeCreators: number;
  activeCampaigns: number;
  completionRate: number;
  verificationPassRate: number;
  appealRate: number;
  reversalRate: number;
}

export interface RiskMetrics {
  fraudRate: number;
  suspiciousEventRate: number;
  walletLockRate: number;
  withdrawalHoldRate: number;
  conversionRejectionRate: number;
  gpsSpoofingRate: number;
  identityRiskRate: number;
  grantGamingRate: number;
}

export interface QualityMetrics {
  averageTrustScore: number;
  averageUValueScore: number;
  averageQualityScore: number;
  averageRiskScore: number;
  rewardEfficiency: number;
  campaignRoi: number;
  creatorPayoutEfficiency: number;
}

export interface AnalyticsSnapshot {
  analyticsSnapshotId: string;
  scope: AnalyticsScope;
  scopeId?: string | null;
  period: AnalyticsPeriod;
  periodStart: string;
  periodEnd: string;
  coinCode?: string | null;
  campaignId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  region?: string | null;
  ageBand?: string | null;
  riskClusterId?: string | null;
  economyMetrics: EconomyMetrics;
  behavioralMetrics: BehavioralMetrics;
  riskMetrics: RiskMetrics;
  qualityMetrics: QualityMetrics;
  economyHealthScore: number;
  liquidityHealthScore: number;
  fraudPressureScore: number;
  rewardLeakageScore: number;
  userValueHealthScore: number;
  anomalyScore: number;
  status: AnalyticsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSignalInput {
  analyticsSnapshotId: string;
  scope: AnalyticsScope;
  scopeId?: string | null;
  period: AnalyticsPeriod;
  periodStart: string;
  periodEnd: string;
  coinCode?: string | null;
  campaignId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  region?: string | null;
  ageBand?: string | null;
  riskClusterId?: string | null;
  economyMetrics: EconomyMetrics;
  behavioralMetrics: BehavioralMetrics;
  riskMetrics: RiskMetrics;
  qualityMetrics: QualityMetrics;
  historicalEconomyHealthScore: number;
  historicalFraudPressureScore: number;
  historicalLiquidityPressureRatio: number;
  historicalRewardLeakageScore: number;
  volumeBaseline: number;
  eventVolume: number;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsRuleSet {
  scope: AnalyticsScope;
  minEconomyHealthScore: number;
  minLiquidityHealthScore: number;
  minUserValueHealthScore: number;
  maxFraudPressureScore: number;
  maxRewardLeakageScore: number;
  maxAnomalyScore: number;
  maxLiquidityPressureRatio: number;
  minReserveCoverageRatio: number;
  maxFraudRate: number;
  maxSuspiciousEventRate: number;
  maxWalletLockRate: number;
  maxWithdrawalHoldRate: number;
  maxConversionRejectionRate: number;
  maxGpsSpoofingRate: number;
  maxIdentityRiskRate: number;
  maxGrantGamingRate: number;
  maxAppealRate: number;
  maxReversalRate: number;
  active: boolean;
}

export interface AnalyticsEvaluationResult {
  analyticsSnapshotId: string;
  scope: AnalyticsScope;
  scopeId?: string | null;
  status: AnalyticsStatus;
  economyHealthScore: number;
  liquidityHealthScore: number;
  fraudPressureScore: number;
  rewardLeakageScore: number;
  userValueHealthScore: number;
  anomalyScore: number;
  riskAlert: boolean;
  liquidityAlert: boolean;
  rewardLeakageAlert: boolean;
  reviewRecommended: boolean;
  auditRecommended: boolean;
  reasons: string[];
  analyticsSnapshotCreatedEvent: AlphabetEvent;
  economyHealthUpdatedEvent?: AlphabetEvent | null;
  riskAnomalyDetectedEvent?: AlphabetEvent | null;
  liquidityPressureDetectedEvent?: AlphabetEvent | null;
  rewardLeakageDetectedEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
