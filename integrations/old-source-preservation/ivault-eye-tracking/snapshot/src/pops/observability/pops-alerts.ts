import type { PopsMetricName } from "./pops-metrics";

export type PopsAlertSeverity = "critical" | "warning";

export interface PopsMetricSnapshot {
  name: PopsMetricName;
  currentValue: number;
  baselineMean?: number;
  baselineStdDev?: number;
}

export interface PopsAlertRule {
  id: string;
  severity: PopsAlertSeverity;
  metricName: PopsMetricName;
  description: string;
  evaluate: (snapshot: PopsMetricSnapshot) => boolean;
}

export interface PopsAlertMatch {
  id: string;
  severity: PopsAlertSeverity;
  metricName: PopsMetricName;
  description: string;
  currentValue: number;
}

const DEFAULT_THRESHOLDS = {
  privacyReceiptFailureRate: 0.02,
  rewardApprovalSpikeZScore: 3,
  fraudRiskSpikeZScore: 3,
  walletIntentCreationFailureRate: 0.03,
  pipelineFailureRate: 0.05,
  rawDataStoredCount: 0,
  adminReviewBacklog: 100,
  degradedSessionsRate: 0.2,
  eventRejectionRate: 0.15,
  disputeRate: 0.05,
  campaignHoldRate: 0.2,
  lowConfidenceSessionsRate: 0.18,
};

function isAbnormalSpike(
  current: number,
  baselineMean: number | undefined,
  baselineStdDev: number | undefined,
  minZScore: number,
): boolean {
  if (!Number.isFinite(current) || !Number.isFinite(baselineMean) || !Number.isFinite(baselineStdDev)) {
    return false;
  }
  if ((baselineStdDev ?? 0) <= 0) return false;
  const zScore = (current - (baselineMean ?? 0)) / (baselineStdDev ?? 1);
  return zScore >= minZScore;
}

export const POPS_ALERT_RULES: readonly PopsAlertRule[] = [
  {
    id: "privacy_receipt_failure_rate_high",
    severity: "critical",
    metricName: "pops.privacy_receipts.failed",
    description: "Privacy receipt creation failure rate is above threshold.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.privacyReceiptFailureRate,
  },
  {
    id: "reward_approval_spike_abnormal",
    severity: "critical",
    metricName: "pops.rewards.approved_full",
    description: "Reward approval spike is abnormal vs baseline.",
    evaluate: (snapshot) =>
      isAbnormalSpike(
        snapshot.currentValue,
        snapshot.baselineMean,
        snapshot.baselineStdDev,
        DEFAULT_THRESHOLDS.rewardApprovalSpikeZScore,
      ),
  },
  {
    id: "fraud_risk_spike_abnormal",
    severity: "critical",
    metricName: "pops.fraud_risk.avg",
    description: "Fraud risk spike is abnormal vs baseline.",
    evaluate: (snapshot) =>
      isAbnormalSpike(
        snapshot.currentValue,
        snapshot.baselineMean,
        snapshot.baselineStdDev,
        DEFAULT_THRESHOLDS.fraudRiskSpikeZScore,
      ),
  },
  {
    id: "wallet_intent_creation_failure_high",
    severity: "critical",
    metricName: "pops.wallet_intents.denied",
    description: "Wallet intent creation failures are above threshold.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.walletIntentCreationFailureRate,
  },
  {
    id: "pipeline_failure_rate_high",
    severity: "critical",
    metricName: "pops.sessions.failed",
    description: "Pipeline failure rate is high.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.pipelineFailureRate,
  },
  {
    id: "raw_data_stored_unexpected",
    severity: "critical",
    metricName: "pops.raw_camera_stored.count",
    description: "Raw sensitive data appears to be stored unexpectedly.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.rawDataStoredCount,
  },
  {
    id: "admin_review_backlog_high",
    severity: "critical",
    metricName: "pops.rewards.pending_review",
    description: "Admin review backlog is above threshold.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.adminReviewBacklog,
  },
  {
    id: "degraded_sessions_increasing",
    severity: "warning",
    metricName: "pops.sessions.degraded",
    description: "Degraded sessions are increasing.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.degradedSessionsRate,
  },
  {
    id: "event_rejection_increasing",
    severity: "warning",
    metricName: "pops.events.rejected",
    description: "Event rejection is increasing.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.eventRejectionRate,
  },
  {
    id: "dispute_rate_increasing",
    severity: "warning",
    metricName: "pops.reward_dispute_rate",
    description: "Reward dispute rate is increasing.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.disputeRate,
  },
  {
    id: "campaign_hold_rate_abnormal",
    severity: "warning",
    metricName: "pops.rewards.hold_rate",
    description: "Campaign hold rate is abnormal.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.campaignHoldRate,
  },
  {
    id: "low_confidence_sessions_increasing",
    severity: "warning",
    metricName: "pops.visual_presence_degraded_rate",
    description: "Low confidence sessions are increasing.",
    evaluate: (snapshot) => snapshot.currentValue > DEFAULT_THRESHOLDS.lowConfidenceSessionsRate,
  },
];

export function evaluatePopsAlerts(
  snapshots: readonly PopsMetricSnapshot[],
  rules: readonly PopsAlertRule[] = POPS_ALERT_RULES,
): PopsAlertMatch[] {
  const byMetric = new Map<PopsMetricName, PopsMetricSnapshot>();
  for (const snapshot of snapshots) {
    byMetric.set(snapshot.name, snapshot);
  }

  const matches: PopsAlertMatch[] = [];
  for (const rule of rules) {
    const snapshot = byMetric.get(rule.metricName);
    if (!snapshot) continue;
    if (!rule.evaluate(snapshot)) continue;

    matches.push({
      id: rule.id,
      severity: rule.severity,
      metricName: rule.metricName,
      description: rule.description,
      currentValue: snapshot.currentValue,
    });
  }

  return matches;
}
