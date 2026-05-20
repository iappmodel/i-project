import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function insertOperationalAlertDb(params: {
  alertType: string;
  alertSource: string;
  status: string;
  severity: string;
  priority: string;

  assignedTeam?: string | null;
  assignedUserId?: string | null;
  routeReason?: string | null;

  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  ledgerEntryId?: string | null;
  originalLedgerEntryId?: string | null;
  reversalLedgerEntryId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  providerReconciliationId?: string | null;
  reviewCaseId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  campaignId?: string | null;
  notificationId?: string | null;
  auditRecordId?: string | null;
  alphabetEventId?: string | null;

  sourceAnomalyIds?: string[];
  sourceEventIds?: string[];

  evidence?: Json;
  redactedEvidence?: Json;

  publicSummary?: string | null;
  internalSummary?: string | null;

  riskScores?: Json;
  metadata?: Json;

  dedupeKey?: string | null;
  idempotencyKey?: string | null;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("operational_alerts")
    .insert({
      alert_type: params.alertType,
      alert_source: params.alertSource,
      status: params.status,
      severity: params.severity,
      priority: params.priority,

      assigned_team: params.assignedTeam ?? null,
      assigned_user_id: params.assignedUserId ?? null,
      route_reason: params.routeReason ?? null,

      user_id: params.userId ?? null,
      wallet_id: params.walletId ?? null,
      wallet_account_id: params.walletAccountId ?? null,
      ledger_entry_id: params.ledgerEntryId ?? null,
      original_ledger_entry_id: params.originalLedgerEntryId ?? null,
      reversal_ledger_entry_id: params.reversalLedgerEntryId ?? null,
      external_transfer_id: params.externalTransferId ?? null,
      compensation_id: params.compensationId ?? null,
      provider_reconciliation_id: params.providerReconciliationId ?? null,
      review_case_id: params.reviewCaseId ?? null,
      policy_decision_id: params.policyDecisionId ?? null,
      pipeline_id: params.pipelineId ?? null,
      saga_id: params.sagaId ?? null,
      execution_request_id: params.executionRequestId ?? null,
      campaign_id: params.campaignId ?? null,
      notification_id: params.notificationId ?? null,
      audit_record_id: params.auditRecordId ?? null,
      alphabet_event_id: params.alphabetEventId ?? null,

      source_anomaly_ids: params.sourceAnomalyIds ?? [],
      source_event_ids: params.sourceEventIds ?? [],

      evidence: params.evidence ?? {},
      redacted_evidence: params.redactedEvidence ?? {},

      public_summary: params.publicSummary ?? null,
      internal_summary: params.internalSummary ?? null,

      risk_scores: params.riskScores ?? {},
      metadata: params.metadata ?? {},

      dedupe_key: params.dedupeKey ?? null,
      idempotency_key: params.idempotencyKey ?? null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateOperationalAlertReviewCaseIdDb(params: {
  alertId: string;
  reviewCaseId: string;
}) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("operational_alerts")
    .update({
      review_case_id: params.reviewCaseId,
      updated_at: now
    })
    .eq("alert_id", params.alertId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getOperationalAlertDb(alertId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("operational_alerts")
    .select("*")
    .eq("alert_id", alertId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOpenOperationalAlertByDedupeKeyDb(dedupeKey: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("operational_alerts")
    .select("*")
    .eq("dedupe_key", dedupeKey)
    .in("status", [
      "alert_created",
      "alert_open",
      "alert_acknowledged",
      "alert_investigating",
      "alert_escalated"
    ])
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listOperationalAlertsDb(params?: {
  status?: string | null;
  severity?: string | null;
  assignedTeam?: string | null;
  limit?: number;
}) {
  const db = createServiceDbClient();

  let query = db
    .from("operational_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.status) query = query.eq("status", params.status);
  if (params?.severity) query = query.eq("severity", params.severity);
  if (params?.assignedTeam) query = query.eq("assigned_team", params.assignedTeam);

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function updateOperationalAlertStatusDb(params: {
  alertId: string;
  status: string;
  actorUserId?: string | null;
  reasonCodes?: string[];
  notes?: string | null;
}) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    status: params.status,
    updated_at: now
  };

  if (params.status === "alert_acknowledged") {
    update.acknowledged_by_user_id = params.actorUserId ?? null;
    update.acknowledged_at = now;
  }

  if (params.status === "alert_resolved" || params.status === "alert_dismissed") {
    update.resolved_by_user_id = params.actorUserId ?? null;
    update.resolved_at = now;
    update.resolution_reason_codes = params.reasonCodes ?? [];
    update.resolution_notes = params.notes ?? null;
  }

  if (params.status === "alert_escalated") {
    update.escalated_by_user_id = params.actorUserId ?? null;
    update.escalated_at = now;
    update.escalation_reason_codes = params.reasonCodes ?? [];
  }

  const { data, error } = await db
    .from("operational_alerts")
    .update(update)
    .eq("alert_id", params.alertId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
