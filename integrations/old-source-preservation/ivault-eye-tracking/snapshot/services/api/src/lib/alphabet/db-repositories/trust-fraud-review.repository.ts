import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";
import type { TrustFraudReviewCounts } from "@/types/alphabet/trust-fraud-review.types";

type RowResult = { data: unknown[] | null; error: unknown };

async function safeSelect(
  table: string,
  params?: { periodStart?: string; periodEnd?: string; limit?: number }
): Promise<unknown[]> {
  const db = createServiceDbClient();
  let query = db.from(table).select("*");

  if (params?.periodStart && params?.periodEnd) {
    query = query.gte("created_at", params.periodStart).lt("created_at", params.periodEnd);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = (await query) as RowResult;
  if (error) {
    return [];
  }
  return data ?? [];
}

export async function fetchTrustFraudReviewSourceRowsDb(params: {
  periodStart: string;
  periodEnd: string;
}) {
  const limit = 5000;
  const [users, wallets, walletAccounts, ledgerEntries, alphabetEvents, trustEvents, uValueEvents, rewardEvents] =
    await Promise.all([
      safeSelect("profiles", { limit }),
      safeSelect("wallets", { limit }),
      safeSelect("wallet_accounts", { limit }),
      safeSelect("ledger_entries", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("alphabet_events", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("trust_impact_events", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("u_value_impact_events", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("reward_events", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit })
    ]);

  const [payouts, campaigns, deviceSignals, presenceSignals, policyDecisions, adminReviewCases, operationalAlerts] =
    await Promise.all([
      safeSelect("external_transfers", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("campaigns", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("device_signals", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("presence_signals", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("policy_decisions", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("admin_review_cases", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit }),
      safeSelect("operational_alerts", { periodStart: params.periodStart, periodEnd: params.periodEnd, limit })
    ]);

  return {
    users,
    wallets,
    walletAccounts,
    ledgerEntries,
    alphabetEvents,
    trustEvents,
    uValueEvents,
    rewardEvents,
    payouts,
    campaigns,
    deviceSignals,
    presenceSignals,
    policyDecisions,
    adminReviewCases,
    operationalAlerts
  };
}

export async function insertTrustFraudReviewBatchDb(params: {
  batchId?: string | null;
  batchScope: string;
  status: string;
  severity: string;
  batchDate: string;
  periodStart: string;
  periodEnd: string;
  counts: TrustFraudReviewCounts;
  findingCount: number;
  criticalFindingCount: number;
  fraudFindingCount: number;
  walletFindingCount: number;
  payoutFindingCount: number;
  campaignFindingCount: number;
  identityFindingCount: number;
  deviceFindingCount: number;
  rewardFindingCount: number;
  presenceFindingCount: number;
  agePolicyFindingCount: number;
  batchRiskScore: number;
  batchConfidenceScore: number;
  actionUrgencyScore: number;
  findings: Json;
  recommendedActions: Json;
  breakdown: Json;
  sourceEventIds?: string[];
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];
  reasonCodes?: string[];
  metadata?: Json;
  generatedBy?: string;
}) {
  const db = createServiceDbClient();
  const c = params.counts;

  const row = {
    batch_id: params.batchId ?? undefined,
    batch_scope: params.batchScope,
    status: params.status,
    severity: params.severity,
    batch_date: params.batchDate,
    period_start: params.periodStart,
    period_end: params.periodEnd,
    user_count: c.userCount ?? 0,
    wallet_count: c.walletCount ?? 0,
    wallet_account_count: c.walletAccountCount ?? 0,
    ledger_entry_count: c.ledgerEntryCount ?? 0,
    alphabet_event_count: c.alphabetEventCount ?? 0,
    trust_event_count: c.trustEventCount ?? 0,
    u_value_event_count: c.uValueEventCount ?? 0,
    reward_event_count: c.rewardEventCount ?? 0,
    payout_count: c.payoutCount ?? 0,
    campaign_count: c.campaignCount ?? 0,
    device_signal_count: c.deviceSignalCount ?? 0,
    presence_signal_count: c.presenceSignalCount ?? 0,
    policy_decision_count: c.policyDecisionCount ?? 0,
    admin_review_case_count: c.adminReviewCaseCount ?? 0,
    operational_alert_count: c.operationalAlertCount ?? 0,
    finding_count: params.findingCount,
    critical_finding_count: params.criticalFindingCount,
    fraud_finding_count: params.fraudFindingCount,
    wallet_finding_count: params.walletFindingCount,
    payout_finding_count: params.payoutFindingCount,
    campaign_finding_count: params.campaignFindingCount,
    identity_finding_count: params.identityFindingCount,
    device_finding_count: params.deviceFindingCount,
    reward_finding_count: params.rewardFindingCount,
    presence_finding_count: params.presenceFindingCount,
    age_policy_finding_count: params.agePolicyFindingCount,
    batch_risk_score: params.batchRiskScore,
    batch_confidence_score: params.batchConfidenceScore,
    action_urgency_score: params.actionUrgencyScore,
    findings: params.findings,
    recommended_actions: params.recommendedActions,
    breakdown: params.breakdown,
    source_event_ids: params.sourceEventIds ?? [],
    created_alert_ids: params.createdAlertIds ?? [],
    created_review_case_ids: params.createdReviewCaseIds ?? [],
    reason_codes: params.reasonCodes ?? [],
    metadata: params.metadata ?? {},
    generated_by: params.generatedBy ?? "scheduled_job"
  };

  const { data, error } = await db.from("trust_fraud_review_batches").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateTrustFraudReviewBatchSidecarsDb(params: {
  batchId: string;
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];
}) {
  const db = createServiceDbClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };
  if (params.createdAlertIds) patch.created_alert_ids = params.createdAlertIds;
  if (params.createdReviewCaseIds) patch.created_review_case_ids = params.createdReviewCaseIds;

  const { error } = await db.from("trust_fraud_review_batches").update(patch).eq("batch_id", params.batchId);
  if (error) throw error;
}

export async function listTrustFraudReviewBatchesDb(params?: {
  status?: string | null;
  severity?: string | null;
  batchScope?: string | null;
  limit?: number;
}) {
  const db = createServiceDbClient();
  let query = db
    .from("trust_fraud_review_batches")
    .select("*")
    .order("batch_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.status) query = query.eq("status", params.status);
  if (params?.severity) query = query.eq("severity", params.severity);
  if (params?.batchScope) query = query.eq("batch_scope", params.batchScope);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrustFraudReviewBatchDb(batchId: string) {
  const db = createServiceDbClient();
  const { data, error } = await db
    .from("trust_fraud_review_batches")
    .select("*")
    .eq("batch_id", batchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
