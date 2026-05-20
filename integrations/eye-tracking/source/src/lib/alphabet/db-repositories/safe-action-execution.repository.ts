import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function insertSafeActionExecutionDb(params: {
  safeActionType: string;
  requestedAction: string;
  normalizedAction: string;
  status: string;
  severity: string;
  executionMode: string;

  commandItemId?: string | null;
  commandDecisionId?: string | null;
  reviewCaseId?: string | null;
  alertId?: string | null;

  actorAdminId: string;
  approverAdminId?: string | null;

  linkedObjectIds?: Record<string, string | null | undefined>;

  targetObjectType?: string | null;
  targetObjectId?: string | null;

  policyAllowed: boolean;
  policyBlocked: boolean;
  policyRequiresApproval: boolean;
  policyRequiresManualExecution: boolean;
  policyReasonCodes: string[];

  idempotencyKey: string;
  dedupeKey: string;
  idempotencyStatus: string;

  executionSteps: Json;
  currentStep?: string | null;
  completedSteps?: string[];
  failedStep?: string | null;

  beforeState?: Json;
  afterState?: Json;

  evidence?: Json;
  redactedEvidence?: Json;

  resultPayload?: Json;
  errorPayload?: Json;

  executionRiskScore: number;
  confidenceScore: number;

  sourceEventIds?: string[];
  auditRecordIds?: string[];

  reasonCodes?: string[];
  metadata?: Json;
}) {
  const db = createServiceDbClient();
  const ids = params.linkedObjectIds ?? {};

  const { data, error } = await db
    .from("safe_action_executions")
    .insert({
      safe_action_type: params.safeActionType,
      requested_action: params.requestedAction,
      normalized_action: params.normalizedAction,

      status: params.status,
      severity: params.severity,
      execution_mode: params.executionMode,

      command_item_id: params.commandItemId ?? null,
      command_decision_id: params.commandDecisionId ?? null,
      review_case_id: params.reviewCaseId ?? null,
      alert_id: params.alertId ?? null,

      actor_admin_id: params.actorAdminId,
      approver_admin_id: params.approverAdminId ?? null,

      user_id: ids.userId ?? null,
      creator_id: ids.creatorId ?? null,
      wallet_id: ids.walletId ?? null,
      wallet_account_id: ids.walletAccountId ?? null,
      campaign_id: ids.campaignId ?? null,
      payout_id: ids.payoutId ?? null,
      external_transfer_id: ids.externalTransferId ?? null,
      ledger_entry_id: ids.ledgerEntryId ?? null,
      policy_decision_id: ids.policyDecisionId ?? null,
      compensation_id: ids.compensationId ?? null,
      execution_request_id: ids.executionRequestId ?? null,

      target_object_type: params.targetObjectType ?? null,
      target_object_id: params.targetObjectId ?? null,

      policy_allowed: params.policyAllowed,
      policy_blocked: params.policyBlocked,
      policy_requires_approval: params.policyRequiresApproval,
      policy_requires_manual_execution: params.policyRequiresManualExecution,
      policy_reason_codes: params.policyReasonCodes,

      idempotency_key: params.idempotencyKey,
      dedupe_key: params.dedupeKey,
      idempotency_status: params.idempotencyStatus,

      execution_steps: params.executionSteps,
      current_step: params.currentStep ?? null,
      completed_steps: params.completedSteps ?? [],
      failed_step: params.failedStep ?? null,

      before_state: params.beforeState ?? {},
      after_state: params.afterState ?? {},

      evidence: params.evidence ?? {},
      redacted_evidence: params.redactedEvidence ?? {},

      result_payload: params.resultPayload ?? {},
      error_payload: params.errorPayload ?? {},

      execution_risk_score: params.executionRiskScore,
      confidence_score: params.confidenceScore,

      source_event_ids: params.sourceEventIds ?? [],
      audit_record_ids: params.auditRecordIds ?? [],

      reason_codes: params.reasonCodes ?? [],
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateSafeActionExecutionDb(params: {
  safeActionExecutionId: string;
  patch: Record<string, unknown>;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("safe_action_executions")
    .update({
      ...params.patch,
      updated_at: new Date().toISOString()
    })
    .eq("safe_action_execution_id", params.safeActionExecutionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getSafeActionExecutionDb(safeActionExecutionId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("safe_action_executions")
    .select("*")
    .eq("safe_action_execution_id", safeActionExecutionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listSafeActionExecutionsDb(params?: {
  status?: string | null;
  safeActionType?: string | null;
  severity?: string | null;
  executionMode?: string | null;
  commandItemId?: string | null;
  limit?: number;
}) {
  const db = createServiceDbClient();

  let query = db
    .from("safe_action_executions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.status) query = query.eq("status", params.status);
  if (params?.safeActionType) query = query.eq("safe_action_type", params.safeActionType);
  if (params?.severity) query = query.eq("severity", params.severity);
  if (params?.executionMode) query = query.eq("execution_mode", params.executionMode);
  if (params?.commandItemId) query = query.eq("command_item_id", params.commandItemId);

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function createSafeExecutionRequestDb(params: {
  requestType: string;
  targetObjectType?: string | null;
  targetObjectId?: string | null;
  safeActionExecutionId: string;
  actorAdminId: string;
  idempotencyKey: string;
  dedupeKey: string;
  payload?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("execution_requests")
    .insert({
      request_type: params.requestType,
      target_system: "safe_action_execution",
      target_object_type: params.targetObjectType ?? null,
      target_object_id: params.targetObjectId ?? null,
      status: "execution_created",
      source_object_type: "safe_action_execution",
      source_object_id: params.safeActionExecutionId,
      actor_admin_id: params.actorAdminId,
      idempotency_key: params.idempotencyKey,
      dedupe_key: params.dedupeKey,
      payload: params.payload ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
