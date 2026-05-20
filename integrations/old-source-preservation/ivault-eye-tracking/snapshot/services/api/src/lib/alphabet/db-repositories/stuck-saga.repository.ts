import type { Json } from "@/types/alphabet/database.types";
import { createServiceDbClient } from "../db-client";

export async function insertStuckSagaResultDb(params: {
  stuckType: string;
  scanScope: string;
  status: string;
  severity: string;

  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;

  sagaId?: string | null;
  pipelineId?: string | null;
  executionRequestId?: string | null;
  policyDecisionId?: string | null;

  ledgerEntryId?: string | null;
  externalTransferId?: string | null;
  providerReconciliationId?: string | null;
  compensationId?: string | null;
  reviewCaseId?: string | null;

  startedAt?: string | null;
  updatedAt?: string | null;
  lastProgressAt?: string | null;

  ageSeconds?: number;
  staleSeconds?: number;
  maxAllowedAgeSeconds?: number;
  maxAllowedStaleSeconds?: number;

  internalDebitAmount?: number;
  externalTransferAmount?: number;
  pendingAmount?: number;
  unknownAmount?: number;
  compensationAmount?: number;
  exposureAmount?: number;

  riskScores?: Json;
  evidence?: Json;
  redactedEvidence?: Json;

  sourceEventIds?: string[];
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];

  reasonCodes?: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("stuck_saga_results")
    .insert({
      stuck_type: params.stuckType,
      scan_scope: params.scanScope,
      status: params.status,
      severity: params.severity,

      user_id: params.userId ?? null,
      wallet_id: params.walletId ?? null,
      wallet_account_id: params.walletAccountId ?? null,

      saga_id: params.sagaId ?? null,
      pipeline_id: params.pipelineId ?? null,
      execution_request_id: params.executionRequestId ?? null,
      policy_decision_id: params.policyDecisionId ?? null,

      ledger_entry_id: params.ledgerEntryId ?? null,
      external_transfer_id: params.externalTransferId ?? null,
      provider_reconciliation_id: params.providerReconciliationId ?? null,
      compensation_id: params.compensationId ?? null,
      review_case_id: params.reviewCaseId ?? null,

      started_at: params.startedAt ?? null,
      updated_at: params.updatedAt ?? null,
      last_progress_at: params.lastProgressAt ?? null,

      age_seconds: params.ageSeconds ?? 0,
      stale_seconds: params.staleSeconds ?? 0,
      max_allowed_age_seconds: params.maxAllowedAgeSeconds ?? 0,
      max_allowed_stale_seconds: params.maxAllowedStaleSeconds ?? 0,

      internal_debit_amount: params.internalDebitAmount ?? 0,
      external_transfer_amount: params.externalTransferAmount ?? 0,
      pending_amount: params.pendingAmount ?? 0,
      unknown_amount: params.unknownAmount ?? 0,
      compensation_amount: params.compensationAmount ?? 0,
      exposure_amount: params.exposureAmount ?? 0,

      risk_scores: params.riskScores ?? {},
      evidence: params.evidence ?? {},
      redacted_evidence: params.redactedEvidence ?? {},

      source_event_ids: params.sourceEventIds ?? [],
      created_alert_ids: params.createdAlertIds ?? [],
      created_review_case_ids: params.createdReviewCaseIds ?? [],

      reason_codes: params.reasonCodes ?? [],
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateStuckSagaResultSidecarsDb(params: {
  stuckSagaResultId: string;
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];
  sourceEventIds?: string[];
  reviewCaseId?: string | null;
}) {
  const db = createServiceDbClient();
  const patch: Record<string, unknown> = {};
  if (params.createdAlertIds !== undefined) patch.created_alert_ids = params.createdAlertIds;
  if (params.createdReviewCaseIds !== undefined) patch.created_review_case_ids = params.createdReviewCaseIds;
  if (params.sourceEventIds !== undefined) patch.source_event_ids = params.sourceEventIds;
  if (params.reviewCaseId !== undefined) patch.review_case_id = params.reviewCaseId;

  if (Object.keys(patch).length === 0) return;

  const { error } = await db
    .from("stuck_saga_results")
    .update(patch)
    .eq("stuck_saga_result_id", params.stuckSagaResultId);

  if (error) throw error;
}

export async function fetchStuckSagaScanRowsDb(params?: {
  olderThanMinutes?: number;
  limit?: number;
}) {
  const db = createServiceDbClient();

  const cutoff = new Date(
    Date.now() - (params?.olderThanMinutes ?? 15) * 60_000
  ).toISOString();

  const [
    sagas,
    pipelines,
    executions,
    transfers,
    ledgers,
    reconciliations,
    compensations,
    reviews
  ] = await Promise.all([
    db
      .from("saga_records")
      .select("*")
      .in("status", [
        "saga_created",
        "saga_started",
        "saga_running",
        "saga_retry_pending",
        "saga_partially_completed",
        "saga_failed"
      ])
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(params?.limit ?? 100),

    db
      .from("pipeline_records")
      .select("*")
      .in("status", [
        "pipeline_created",
        "pipeline_locked",
        "pipeline_running",
        "pipeline_retry_pending",
        "pipeline_failed"
      ])
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(params?.limit ?? 100),

    db
      .from("execution_requests")
      .select("*")
      .in("status", [
        "execution_created",
        "execution_running",
        "execution_retry_pending",
        "execution_failed",
        "execution_dead_lettered"
      ])
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(params?.limit ?? 100),

    db
      .from("external_transfers")
      .select("*")
      .in("status", [
        "provider_request_created",
        "provider_request_sent",
        "provider_pending",
        "provider_unknown",
        "transfer_requires_review",
        "provider_failed"
      ])
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(params?.limit ?? 100),

    db
      .from("ledger_entries")
      .select("*")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500),

    db
      .from("provider_reconciliation_records")
      .select("*")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500),

    db
      .from("compensation_records")
      .select("*")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500),

    db
      .from("admin_review_cases")
      .select("*")
      .in("status", [
        "review_created",
        "review_queued",
        "review_assigned",
        "review_in_progress",
        "review_escalated"
      ])
      .order("created_at", { ascending: false })
      .limit(500)
  ]);

  const errors = [
    sagas.error,
    pipelines.error,
    executions.error,
    transfers.error,
    ledgers.error,
    reconciliations.error,
    compensations.error,
    reviews.error
  ].filter(Boolean);

  if (errors.length) throw errors[0];

  return {
    sagas: sagas.data ?? [],
    pipelines: pipelines.data ?? [],
    executions: executions.data ?? [],
    transfers: transfers.data ?? [],
    ledgers: ledgers.data ?? [],
    reconciliations: reconciliations.data ?? [],
    compensations: compensations.data ?? [],
    reviews: reviews.data ?? []
  };
}
