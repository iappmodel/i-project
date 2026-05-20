import type {
  AnalyticsEvaluationResult,
  AnalyticsPeriod,
  AnalyticsScope,
  AnalyticsSignalInput,
  AnalyticsSnapshot,
  BehavioralMetrics,
  EconomyMetrics,
  QualityMetrics,
  RiskMetrics
} from "../../types/alphabet/analytics.types";
import { evaluateAnalyticsSnapshot } from "./analytics-engine";

type AnalyticsStoreState = {
  snapshots: Map<string, AnalyticsSnapshot>;
  results: Map<string, AnalyticsEvaluationResult>;
};

const store: AnalyticsStoreState = {
  snapshots: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createAnalyticsSnapshot(params: {
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
}): AnalyticsSnapshot {
  const now = nowIso();

  const snapshot: AnalyticsSnapshot = {
    analyticsSnapshotId: createId("analytics_snapshot"),
    scope: params.scope,
    scopeId: params.scopeId ?? null,
    period: params.period,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    coinCode: params.coinCode ?? null,
    campaignId: params.campaignId ?? null,
    creatorId: params.creatorId ?? null,
    businessId: params.businessId ?? null,
    region: params.region ?? null,
    ageBand: params.ageBand ?? null,
    riskClusterId: params.riskClusterId ?? null,
    economyMetrics: params.economyMetrics,
    behavioralMetrics: params.behavioralMetrics,
    riskMetrics: params.riskMetrics,
    qualityMetrics: params.qualityMetrics,
    economyHealthScore: 0,
    liquidityHealthScore: 0,
    fraudPressureScore: 0,
    rewardLeakageScore: 0,
    userValueHealthScore: 0,
    anomalyScore: 0,
    status: "watch",
    createdAt: now,
    updatedAt: now
  };

  store.snapshots.set(snapshot.analyticsSnapshotId, snapshot);

  return snapshot;
}

export function getAnalyticsSnapshot(
  analyticsSnapshotId: string
): AnalyticsSnapshot | null {
  return store.snapshots.get(analyticsSnapshotId) ?? null;
}

export function listAnalyticsSnapshots(params?: {
  scope?: AnalyticsScope;
  scopeId?: string;
  period?: AnalyticsPeriod;
}): AnalyticsSnapshot[] {
  return Array.from(store.snapshots.values()).filter((snapshot) => {
    if (params?.scope && snapshot.scope !== params.scope) return false;
    if (params?.scopeId && snapshot.scopeId !== params.scopeId) return false;
    if (params?.period && snapshot.period !== params.period) return false;
    return true;
  });
}

export function evaluateStoredAnalyticsSnapshot(
  input: Omit<
    AnalyticsSignalInput,
    | "analyticsSnapshotId"
    | "scope"
    | "scopeId"
    | "period"
    | "periodStart"
    | "periodEnd"
    | "coinCode"
    | "campaignId"
    | "creatorId"
    | "businessId"
    | "region"
    | "ageBand"
    | "riskClusterId"
    | "economyMetrics"
    | "behavioralMetrics"
    | "riskMetrics"
    | "qualityMetrics"
  > & {
    analyticsSnapshotId: string;
  }
): AnalyticsEvaluationResult {
  const snapshot = getAnalyticsSnapshot(input.analyticsSnapshotId);

  if (!snapshot) {
    throw new Error("Analytics snapshot not found.");
  }

  const result = evaluateAnalyticsSnapshot({
    ...input,
    analyticsSnapshotId: snapshot.analyticsSnapshotId,
    scope: snapshot.scope,
    scopeId: snapshot.scopeId,
    period: snapshot.period,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    coinCode: snapshot.coinCode,
    campaignId: snapshot.campaignId,
    creatorId: snapshot.creatorId,
    businessId: snapshot.businessId,
    region: snapshot.region,
    ageBand: snapshot.ageBand,
    riskClusterId: snapshot.riskClusterId,
    economyMetrics: snapshot.economyMetrics,
    behavioralMetrics: snapshot.behavioralMetrics,
    riskMetrics: snapshot.riskMetrics,
    qualityMetrics: snapshot.qualityMetrics,
    metadata: {
      ...input.metadata
    }
  });

  const next: AnalyticsSnapshot = {
    ...snapshot,
    economyHealthScore: result.economyHealthScore,
    liquidityHealthScore: result.liquidityHealthScore,
    fraudPressureScore: result.fraudPressureScore,
    rewardLeakageScore: result.rewardLeakageScore,
    userValueHealthScore: result.userValueHealthScore,
    anomalyScore: result.anomalyScore,
    status: result.status,
    updatedAt: nowIso()
  };

  store.snapshots.set(next.analyticsSnapshotId, next);
  store.results.set(result.analyticsSnapshotId, result);

  return result;
}

export function getAnalyticsEvaluationResult(
  analyticsSnapshotId: string
): AnalyticsEvaluationResult | null {
  return store.results.get(analyticsSnapshotId) ?? null;
}

export function resetAnalyticsStoreForTests(): void {
  store.snapshots.clear();
  store.results.clear();
}
