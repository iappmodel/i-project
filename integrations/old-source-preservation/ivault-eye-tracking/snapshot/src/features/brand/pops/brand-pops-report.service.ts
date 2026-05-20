export type PopsRewardStatus = "APPROVED" | "PARTIAL" | "HELD" | "DENIED";

export interface BrandPopsIntentEvent {
  actionType: string;
  qualified: boolean;
  confidence: number;
  happenedAfterVerifiedExposure: boolean;
}

export interface BrandPopsMomentRecord {
  campaignId: string;
  brandId: string;
  sessionId: string;
  userId: string;
  timestamp: string;
  impressionCount: number;
  verifiedMoment: boolean;
  completed: boolean;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  rewardStatus: PopsRewardStatus;
  spendMinor: number;
  estimatedFraudBlockedMinor?: number;
  ctaIntentQualified?: boolean;
  hasLocationProof?: boolean;
  locationProofVerified?: boolean;
  hasMerchantProof?: boolean;
  merchantProofVerified?: boolean;
  intentEvents?: BrandPopsIntentEvent[];
}

export interface BrandPopsIntentProofRow {
  actionType: string;
  verifiedCount: number;
  averageConfidence: number;
  qualifiedRate: number;
}

export interface BrandPopsCampaignProofReceipt {
  campaignId: string;
  brandId: string;
  spend: number;
  verifiedMoments: number;
  approvedRewards: number;
  heldRewards: number;
  deniedRewards: number;
  averageConfidence: number;
  fraudPreventedEstimate: number;
  dateRange: {
    start: string;
    end: string;
  };
  createdAt: string;
}

export interface BrandPopsReportMetrics {
  totalImpressions: number;
  verifiedMoments: number;
  verifiedReach: number;
  averagePresenceConfidence: number;
  averageAttentionConfidence: number;
  averageIntentConfidence: number;
  approvedRewards: number;
  partialRewards: number;
  heldRewards: number;
  deniedRewards: number;
  estimatedFraudPrevented: number;
  costPerVerifiedMoment: number;
  costPerVerifiedIntent: number;
  completionRate: number;
  ctaIntentQuality: number;
  locationProofSuccessRate?: number;
  merchantProofSuccessRate?: number;
}

export interface BrandPopsExportModel {
  csvSummary: string;
  pdfReadyReportData: {
    campaignId: string;
    brandId: string;
    metrics: BrandPopsReportMetrics;
    intentProofRows: BrandPopsIntentProofRow[];
    dateRange: {
      start: string;
      end: string;
    };
    createdAt: string;
  };
  campaignProofReceipt: BrandPopsCampaignProofReceipt;
  invoiceReconciliationFields: {
    campaignId: string;
    brandId: string;
    spend: number;
    verifiedMoments: number;
    approvedRewards: number;
    partialRewards: number;
    heldRewards: number;
    deniedRewards: number;
    costPerVerifiedMoment: number;
    costPerVerifiedIntent: number;
  };
}

export interface BrandPopsCampaignReport {
  campaignId: string;
  brandId: string;
  dateRange: {
    start: string;
    end: string;
  };
  metrics: BrandPopsReportMetrics;
  intentProofRows: BrandPopsIntentProofRow[];
  exportModel: BrandPopsExportModel;
}

export interface BrandPopsAggregateQuery {
  campaignId: string;
  brandId: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function toCurrency(minor: number): number {
  return Number((minor / 100).toFixed(2));
}

function toRatio(value: number): number {
  return Number(clampConfidence(value).toFixed(4));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, current) => sum + current, 0);
  return total / values.length;
}

function inDateRange(value: string, dateRange?: { start: string; end: string }): boolean {
  if (!dateRange) return true;
  const asMs = new Date(value).getTime();
  const start = new Date(dateRange.start).getTime();
  const end = new Date(dateRange.end).getTime();
  return asMs >= start && asMs <= end;
}

function buildIntentProofRows(records: BrandPopsMomentRecord[]): BrandPopsIntentProofRow[] {
  const buckets = new Map<string, { total: number; qualified: number; confidence: number }>();

  for (const record of records) {
    const events = record.intentEvents ?? [];
    for (const event of events) {
      const bucket = buckets.get(event.actionType) ?? { total: 0, qualified: 0, confidence: 0 };
      if (event.happenedAfterVerifiedExposure) {
        bucket.total += 1;
        bucket.confidence += clampConfidence(event.confidence);
        if (event.qualified) {
          bucket.qualified += 1;
        }
      }
      buckets.set(event.actionType, bucket);
    }
  }

  return [...buckets.entries()]
    .map(([actionType, bucket]) => ({
      actionType,
      verifiedCount: bucket.total,
      averageConfidence: toRatio(safeDivide(bucket.confidence, bucket.total)),
      qualifiedRate: toRatio(safeDivide(bucket.qualified, bucket.total))
    }))
    .sort((a, b) => b.verifiedCount - a.verifiedCount);
}

function buildCsvSummary(input: {
  campaignId: string;
  brandId: string;
  metrics: BrandPopsReportMetrics;
  dateRange: { start: string; end: string };
}): string {
  const { campaignId, brandId, metrics, dateRange } = input;
  const rows: Array<[string, string | number]> = [
    ["campaignId", campaignId],
    ["brandId", brandId],
    ["dateRangeStart", dateRange.start],
    ["dateRangeEnd", dateRange.end],
    ["totalImpressions", metrics.totalImpressions],
    ["verifiedMoments", metrics.verifiedMoments],
    ["verifiedReach", metrics.verifiedReach],
    ["averagePresenceConfidence", metrics.averagePresenceConfidence],
    ["averageAttentionConfidence", metrics.averageAttentionConfidence],
    ["averageIntentConfidence", metrics.averageIntentConfidence],
    ["approvedRewards", metrics.approvedRewards],
    ["partialRewards", metrics.partialRewards],
    ["heldRewards", metrics.heldRewards],
    ["deniedRewards", metrics.deniedRewards],
    ["estimatedFraudPrevented", metrics.estimatedFraudPrevented],
    ["costPerVerifiedMoment", metrics.costPerVerifiedMoment],
    ["costPerVerifiedIntent", metrics.costPerVerifiedIntent],
    ["completionRate", metrics.completionRate],
    ["ctaIntentQuality", metrics.ctaIntentQuality],
    ["locationProofSuccessRate", metrics.locationProofSuccessRate ?? ""],
    ["merchantProofSuccessRate", metrics.merchantProofSuccessRate ?? ""]
  ];

  return ["field,value", ...rows.map(([field, value]) => `${field},${value}`)].join("\n");
}

export function queryBrandPopsCampaignAggregate(
  records: BrandPopsMomentRecord[],
  query: BrandPopsAggregateQuery
): BrandPopsMomentRecord[] {
  return records.filter(
    (record) =>
      record.campaignId === query.campaignId &&
      record.brandId === query.brandId &&
      inDateRange(record.timestamp, query.dateRange)
  );
}

export function buildBrandPopsCampaignReport(
  records: BrandPopsMomentRecord[],
  query: BrandPopsAggregateQuery
): BrandPopsCampaignReport {
  const filtered = queryBrandPopsCampaignAggregate(records, query);
  const sortedByTime = [...filtered].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const firstTimestamp = sortedByTime[0]?.timestamp ?? new Date().toISOString();
  const lastTimestamp = sortedByTime[sortedByTime.length - 1]?.timestamp ?? firstTimestamp;
  const dateRange = {
    start: query.dateRange?.start ?? firstTimestamp,
    end: query.dateRange?.end ?? lastTimestamp
  };

  const totalImpressions = filtered.reduce((sum, record) => sum + Math.max(0, record.impressionCount), 0);
  const verifiedRecords = filtered.filter((record) => record.verifiedMoment);
  const verifiedMoments = verifiedRecords.length;
  const uniqueVerifiedUsers = new Set(verifiedRecords.map((record) => record.userId));
  const verifiedReach = uniqueVerifiedUsers.size;

  const approvedRewards = filtered.filter((record) => record.rewardStatus === "APPROVED").length;
  const partialRewards = filtered.filter((record) => record.rewardStatus === "PARTIAL").length;
  const heldRewards = filtered.filter((record) => record.rewardStatus === "HELD").length;
  const deniedRewards = filtered.filter((record) => record.rewardStatus === "DENIED").length;

  const spendMinor = filtered.reduce((sum, record) => sum + Math.max(0, record.spendMinor), 0);
  const fraudPreventedMinor = filtered.reduce(
    (sum, record) => sum + Math.max(0, record.estimatedFraudBlockedMinor ?? 0),
    0
  );

  const verifiedIntentEvents = filtered.flatMap((record) =>
    (record.intentEvents ?? []).filter((event) => event.happenedAfterVerifiedExposure && event.qualified)
  );

  const completedCount = filtered.filter((record) => record.completed).length;
  const ctaQualityInputs = filtered.filter((record) => typeof record.ctaIntentQualified === "boolean");
  const ctaQualityNumerator = ctaQualityInputs.filter((record) => record.ctaIntentQualified).length;

  const locationInputs = filtered.filter((record) => record.hasLocationProof);
  const locationSuccesses = locationInputs.filter((record) => record.locationProofVerified).length;
  const merchantInputs = filtered.filter((record) => record.hasMerchantProof);
  const merchantSuccesses = merchantInputs.filter((record) => record.merchantProofVerified).length;

  const metrics: BrandPopsReportMetrics = {
    totalImpressions,
    verifiedMoments,
    verifiedReach,
    averagePresenceConfidence: toRatio(average(filtered.map((record) => record.presenceConfidence))),
    averageAttentionConfidence: toRatio(average(filtered.map((record) => record.attentionConfidence))),
    averageIntentConfidence: toRatio(average(filtered.map((record) => record.intentConfidence))),
    approvedRewards,
    partialRewards,
    heldRewards,
    deniedRewards,
    estimatedFraudPrevented: toCurrency(fraudPreventedMinor),
    costPerVerifiedMoment: Number(toCurrency(Math.round(safeDivide(spendMinor, verifiedMoments))).toFixed(2)),
    costPerVerifiedIntent: Number(
      toCurrency(Math.round(safeDivide(spendMinor, verifiedIntentEvents.length))).toFixed(2)
    ),
    completionRate: toRatio(safeDivide(completedCount, filtered.length)),
    ctaIntentQuality: toRatio(safeDivide(ctaQualityNumerator, ctaQualityInputs.length)),
    locationProofSuccessRate:
      locationInputs.length > 0 ? toRatio(safeDivide(locationSuccesses, locationInputs.length)) : undefined,
    merchantProofSuccessRate:
      merchantInputs.length > 0 ? toRatio(safeDivide(merchantSuccesses, merchantInputs.length)) : undefined
  };

  const intentProofRows = buildIntentProofRows(filtered);
  const averageConfidence = toRatio(
    average([
      metrics.averagePresenceConfidence,
      metrics.averageAttentionConfidence,
      metrics.averageIntentConfidence
    ])
  );

  const receipt: BrandPopsCampaignProofReceipt = {
    campaignId: query.campaignId,
    brandId: query.brandId,
    spend: toCurrency(spendMinor),
    verifiedMoments: metrics.verifiedMoments,
    approvedRewards: metrics.approvedRewards,
    heldRewards: metrics.heldRewards,
    deniedRewards: metrics.deniedRewards,
    averageConfidence,
    fraudPreventedEstimate: metrics.estimatedFraudPrevented,
    dateRange,
    createdAt: new Date().toISOString()
  };

  const exportModel: BrandPopsExportModel = {
    csvSummary: buildCsvSummary({
      campaignId: query.campaignId,
      brandId: query.brandId,
      metrics,
      dateRange
    }),
    pdfReadyReportData: {
      campaignId: query.campaignId,
      brandId: query.brandId,
      metrics,
      intentProofRows,
      dateRange,
      createdAt: new Date().toISOString()
    },
    campaignProofReceipt: receipt,
    invoiceReconciliationFields: {
      campaignId: query.campaignId,
      brandId: query.brandId,
      spend: toCurrency(spendMinor),
      verifiedMoments: metrics.verifiedMoments,
      approvedRewards: metrics.approvedRewards,
      partialRewards: metrics.partialRewards,
      heldRewards: metrics.heldRewards,
      deniedRewards: metrics.deniedRewards,
      costPerVerifiedMoment: metrics.costPerVerifiedMoment,
      costPerVerifiedIntent: metrics.costPerVerifiedIntent
    }
  };

  return {
    campaignId: query.campaignId,
    brandId: query.brandId,
    dateRange,
    metrics,
    intentProofRows,
    exportModel
  };
}
