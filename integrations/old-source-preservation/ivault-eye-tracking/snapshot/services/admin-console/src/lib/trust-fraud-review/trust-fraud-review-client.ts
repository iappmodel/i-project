export interface TrustFraudReviewBatchRow {
  batch_id: string;
  batch_scope: string;
  status: string;
  severity: string;
  batch_date: string;
  period_start: string;
  period_end: string;
  user_count: number;
  wallet_count: number;
  wallet_account_count: number;
  ledger_entry_count: number;
  alphabet_event_count: number;
  trust_event_count: number;
  u_value_event_count: number;
  reward_event_count: number;
  payout_count: number;
  campaign_count: number;
  device_signal_count: number;
  presence_signal_count: number;
  policy_decision_count: number;
  admin_review_case_count: number;
  operational_alert_count: number;
  finding_count: number;
  critical_finding_count: number;
  fraud_finding_count: number;
  wallet_finding_count: number;
  payout_finding_count: number;
  campaign_finding_count: number;
  identity_finding_count: number;
  device_finding_count: number;
  reward_finding_count: number;
  presence_finding_count: number;
  age_policy_finding_count: number;
  batch_risk_score: number;
  batch_confidence_score: number;
  action_urgency_score: number;
  findings: unknown;
  recommended_actions: unknown;
  breakdown: unknown;
  reason_codes: string[];
  created_at: string;
  updated_at: string;
}

export async function fetchTrustFraudReviewBatches(params?: {
  status?: string;
  severity?: string;
  batchScope?: string;
  limit?: number;
}): Promise<TrustFraudReviewBatchRow[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.severity) query.set("severity", params.severity);
  if (params?.batchScope) query.set("batchScope", params.batchScope);
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await fetch(`/api/admin/trust-fraud-review?${query.toString()}`, {
    cache: "no-store",
    headers: { "x-role": "admin" }
  });
  if (!res.ok) throw new Error("Failed to fetch trust/fraud review batches.");
  const json = await res.json();
  return json.batches ?? [];
}

export async function fetchTrustFraudReviewBatch(batchId: string): Promise<TrustFraudReviewBatchRow> {
  const res = await fetch(`/api/admin/trust-fraud-review/${batchId}`, {
    cache: "no-store",
    headers: { "x-role": "admin" }
  });
  if (!res.ok) throw new Error("Failed to fetch trust/fraud review batch.");
  const json = await res.json();
  return json.batch;
}
