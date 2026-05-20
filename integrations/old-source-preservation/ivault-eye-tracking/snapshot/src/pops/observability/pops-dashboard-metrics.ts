import type { PopsMetricName } from "./pops-metrics";

export interface PopsDashboardQuery {
  id: string;
  title: string;
  description: string;
  metrics: PopsMetricName[];
  expression: string;
}

export interface PopsDashboardSection {
  id: string;
  title: string;
  queries: PopsDashboardQuery[];
}

const RELIABILITY_QUERIES: PopsDashboardQuery[] = [
  {
    id: "session_health_overview",
    title: "Session Health Overview",
    description: "Tracks session lifecycle outcomes.",
    metrics: [
      "pops.sessions.started",
      "pops.sessions.completed",
      "pops.sessions.closed",
      "pops.sessions.abandoned",
      "pops.sessions.degraded",
      "pops.sessions.failed",
    ],
    expression:
      "timeseries(sum(pops.sessions.started), sum(pops.sessions.completed), sum(pops.sessions.failed), sum(pops.sessions.degraded))",
  },
  {
    id: "pipeline_failure_rate",
    title: "Pipeline Failure Rate",
    description: "Fraction of failed sessions over all started sessions.",
    metrics: ["pops.sessions.failed", "pops.sessions.started"],
    expression: "sum(pops.sessions.failed) / nullif(sum(pops.sessions.started), 0)",
  },
  {
    id: "event_quality",
    title: "Event Ingestion Quality",
    description: "Event and signal-batch acceptance quality.",
    metrics: [
      "pops.events.received",
      "pops.events.rejected",
      "pops.events.deduplicated",
      "pops.events.late_arrival",
      "pops.signal_batches.received",
      "pops.signal_batches.rejected",
    ],
    expression:
      "timeseries(sum(pops.events.received), sum(pops.events.rejected), sum(pops.signal_batches.received), sum(pops.signal_batches.rejected))",
  },
];

const SCORING_FRAUD_QUERIES: PopsDashboardQuery[] = [
  {
    id: "confidence_trends",
    title: "Confidence Trends",
    description: "Average scoring confidence by dimension.",
    metrics: [
      "pops.presence_confidence.avg",
      "pops.attention_confidence.avg",
      "pops.intent_confidence.avg",
      "pops.continuity_confidence.avg",
    ],
    expression:
      "timeseries(avg(pops.presence_confidence.avg), avg(pops.attention_confidence.avg), avg(pops.intent_confidence.avg), avg(pops.continuity_confidence.avg))",
  },
  {
    id: "fraud_risk_overview",
    title: "Fraud Risk Overview",
    description: "Average fraud risk and high-risk sessions.",
    metrics: ["pops.fraud_risk.avg", "pops.fraud.high_risk_sessions.count"],
    expression: "timeseries(avg(pops.fraud_risk.avg), sum(pops.fraud.high_risk_sessions.count))",
  },
  {
    id: "fraud_signal_breakdown",
    title: "Fraud Signal Breakdown",
    description: "Counts by fraud signal category.",
    metrics: [
      "pops.fraud.background_progress.count",
      "pops.fraud.impossible_completion.count",
      "pops.fraud.automation_timing.count",
      "pops.fraud.device_integrity_warning.count",
      "pops.fraud.duplicate_reward.count",
    ],
    expression:
      "stacked(sum(pops.fraud.background_progress.count), sum(pops.fraud.impossible_completion.count), sum(pops.fraud.automation_timing.count), sum(pops.fraud.device_integrity_warning.count), sum(pops.fraud.duplicate_reward.count))",
  },
];

const REWARD_WALLET_QUERIES: PopsDashboardQuery[] = [
  {
    id: "reward_decision_mix",
    title: "Reward Decision Mix",
    description: "Distribution of reward outcomes.",
    metrics: [
      "pops.rewards.approved_full",
      "pops.rewards.approved_partial",
      "pops.rewards.pending_review",
      "pops.rewards.held",
      "pops.rewards.denied",
    ],
    expression:
      "pie(sum(pops.rewards.approved_full), sum(pops.rewards.approved_partial), sum(pops.rewards.pending_review), sum(pops.rewards.held), sum(pops.rewards.denied))",
  },
  {
    id: "reward_rate_monitor",
    title: "Reward Hold and Denial Rates",
    description: "Monitors hold and denial rates over time.",
    metrics: ["pops.rewards.hold_rate", "pops.rewards.denial_rate"],
    expression: "timeseries(avg(pops.rewards.hold_rate), avg(pops.rewards.denial_rate))",
  },
  {
    id: "wallet_pipeline_health",
    title: "Wallet Pipeline Health",
    description: "Wallet intent flow and release latency.",
    metrics: [
      "pops.wallet_intents.created",
      "pops.wallet_intents.released",
      "pops.wallet_intents.held",
      "pops.wallet_intents.denied",
      "pops.wallet_release_latency.avg",
    ],
    expression:
      "timeseries(sum(pops.wallet_intents.created), sum(pops.wallet_intents.released), sum(pops.wallet_intents.held), sum(pops.wallet_intents.denied), avg(pops.wallet_release_latency.avg))",
  },
];

const PRIVACY_FRICTION_QUERIES: PopsDashboardQuery[] = [
  {
    id: "privacy_receipt_health",
    title: "Privacy Receipt Health",
    description: "Privacy receipt creation and failure trend.",
    metrics: ["pops.privacy_receipts.created", "pops.privacy_receipts.failed"],
    expression: "timeseries(sum(pops.privacy_receipts.created), sum(pops.privacy_receipts.failed))",
  },
  {
    id: "sensitive_data_guardrails",
    title: "Sensitive Data Guardrails",
    description: "Detects unexpected raw capture storage.",
    metrics: ["pops.raw_camera_stored.count", "pops.raw_audio_stored.count"],
    expression: "timeseries(sum(pops.raw_camera_stored.count), sum(pops.raw_audio_stored.count))",
  },
  {
    id: "user_friction_trend",
    title: "User Friction Trend",
    description: "Operational friction and dispute indicators.",
    metrics: [
      "pops.permission_decline_rate",
      "pops.visual_presence_degraded_rate",
      "pops.session_dropoff_rate",
      "pops.reward_dispute_rate",
      "pops.reward_hold_appeal_rate",
    ],
    expression:
      "timeseries(avg(pops.permission_decline_rate), avg(pops.visual_presence_degraded_rate), avg(pops.session_dropoff_rate), avg(pops.reward_dispute_rate), avg(pops.reward_hold_appeal_rate))",
  },
];

export const POPS_DASHBOARD_SECTIONS: readonly PopsDashboardSection[] = [
  {
    id: "reliability",
    title: "Reliability",
    queries: RELIABILITY_QUERIES,
  },
  {
    id: "scoring_and_fraud",
    title: "Scoring and Fraud",
    queries: SCORING_FRAUD_QUERIES,
  },
  {
    id: "reward_and_wallet",
    title: "Reward and Wallet",
    queries: REWARD_WALLET_QUERIES,
  },
  {
    id: "privacy_and_friction",
    title: "Privacy and Friction",
    queries: PRIVACY_FRICTION_QUERIES,
  },
];
