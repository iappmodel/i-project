// MOCK / DEMO STORE
// This module is demo/in-memory/mock-only and not an authoritative backend source of truth.
// Do not use as the final writer for economy, rewards, wallet, trust, or fraud decisions.
// Backend/API + DB event flows remain authoritative per ownership contract.

import type { TrustFraudReviewBatchRow } from "@/lib/trust-fraud-review/trust-fraud-review-client";

const batches = new Map<string, TrustFraudReviewBatchRow>();
let seeded = false;

function seedIfNeeded() {
  if (seeded) return;
  seeded = true;

  const now = new Date().toISOString();
  const batchId = "f3b8f937-9ad2-4020-a746-18fb87c2ff88";

  batches.set(batchId, {
    batch_id: batchId,
    batch_scope: "global_daily",
    status: "trust_fraud_batch_requires_review",
    severity: "critical",
    batch_date: "2026-04-27",
    period_start: "2026-04-27T00:00:00.000Z",
    period_end: "2026-04-28T00:00:00.000Z",
    user_count: 214,
    wallet_count: 214,
    wallet_account_count: 217,
    ledger_entry_count: 1254,
    alphabet_event_count: 5431,
    trust_event_count: 312,
    u_value_event_count: 301,
    reward_event_count: 1039,
    payout_count: 87,
    campaign_count: 42,
    device_signal_count: 904,
    presence_signal_count: 812,
    policy_decision_count: 76,
    admin_review_case_count: 6,
    operational_alert_count: 4,
    finding_count: 9,
    critical_finding_count: 3,
    fraud_finding_count: 4,
    wallet_finding_count: 1,
    payout_finding_count: 1,
    campaign_finding_count: 1,
    identity_finding_count: 2,
    device_finding_count: 2,
    reward_finding_count: 2,
    presence_finding_count: 1,
    age_policy_finding_count: 1,
    batch_risk_score: 0.81,
    batch_confidence_score: 0.89,
    action_urgency_score: 0.92,
    findings: [
      {
        findingId: "finding-001",
        findingType: "payout_risk_above_threshold",
        category: "payout",
        severity: "critical",
        title: "Payout risk above threshold",
        summary: "Payout pattern indicates elevated transfer-failure risk.",
        recommendedActions: [
          "create_review_case",
          "restrict_withdrawals",
          "escalate_to_risk_team"
        ]
      },
      {
        findingId: "finding-002",
        findingType: "sybil_cluster_candidate",
        category: "identity",
        severity: "critical",
        title: "Sybil cluster candidate",
        summary: "Identity/device graph produced a high-confidence Sybil cluster.",
        recommendedActions: [
          "create_review_case",
          "request_reverification",
          "escalate_to_risk_team"
        ]
      },
      {
        findingId: "finding-003",
        findingType: "age_policy_conflict",
        category: "age_policy",
        severity: "critical",
        title: "Age policy conflict",
        summary: "Age policy conflict requires compliance decision.",
        recommendedActions: [
          "create_review_case",
          "escalate_to_compliance",
          "request_reverification"
        ]
      }
    ],
    recommended_actions: [
      "create_review_case",
      "request_reverification",
      "restrict_withdrawals",
      "escalate_to_risk_team",
      "escalate_to_compliance"
    ],
    breakdown: {
      categories: {
        fraud: 4,
        payout: 1,
        identity: 2,
        age_policy: 1,
        reward: 2
      }
    },
    reason_codes: [
      "trust_fraud_review_critical_finding_requires_review",
      "trust_fraud_review_critical_risk"
    ],
    created_at: now,
    updated_at: now
  });
}

export function listTrustFraudReviewBatches(params?: {
  status?: string | null;
  severity?: string | null;
  batchScope?: string | null;
  limit?: number;
}) {
  seedIfNeeded();
  let rows = [...batches.values()];
  if (params?.status) rows = rows.filter((row) => row.status === params.status);
  if (params?.severity) rows = rows.filter((row) => row.severity === params.severity);
  if (params?.batchScope) rows = rows.filter((row) => row.batch_scope === params.batchScope);
  return rows.slice(0, params?.limit ?? 100);
}

export function getTrustFraudReviewBatch(batchId: string) {
  seedIfNeeded();
  return batches.get(batchId) ?? null;
}
