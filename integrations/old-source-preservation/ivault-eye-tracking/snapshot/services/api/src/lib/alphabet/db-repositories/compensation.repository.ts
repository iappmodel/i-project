import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function insertCompensationRecordDb(params: {
  compensationId?: string;
  compensationType: string;
  triggerType: string;
  status: string;

  originalExecutionRequestId?: string | null;
  originalLedgerEntryId?: string | null;
  originalSagaId?: string | null;
  originalPipelineId?: string | null;
  originalPolicyDecisionId?: string | null;
  originalWalletId?: string | null;
  originalWalletAccountId?: string | null;
  originalUserId: string;

  reversalLedgerEntryId?: string | null;
  reversalExecutionRequestId?: string | null;
  reversalAuditRecordId?: string | null;
  reversalNotificationId?: string | null;

  amount: number;
  coinCode: string;
  originalDirection: "credit" | "debit";
  reversalDirection: "credit" | "debit";

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds?: string[];
  reasonCodes?: string[];

  requiresReview?: boolean;
  actorUserId?: string | null;

  safetyScores?: Json;
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("compensation_records")
    .insert({
      ...(params.compensationId ? { compensation_id: params.compensationId } : {}),
      compensation_type: params.compensationType,
      trigger_type: params.triggerType,
      status: params.status,

      original_execution_request_id: params.originalExecutionRequestId ?? null,
      original_ledger_entry_id: params.originalLedgerEntryId ?? null,
      original_saga_id: params.originalSagaId ?? null,
      original_pipeline_id: params.originalPipelineId ?? null,
      original_policy_decision_id: params.originalPolicyDecisionId ?? null,
      original_wallet_id: params.originalWalletId ?? null,
      original_wallet_account_id: params.originalWalletAccountId ?? null,
      original_user_id: params.originalUserId,

      reversal_ledger_entry_id: params.reversalLedgerEntryId ?? null,
      reversal_execution_request_id: params.reversalExecutionRequestId ?? null,
      reversal_audit_record_id: params.reversalAuditRecordId ?? null,
      reversal_notification_id: params.reversalNotificationId ?? null,

      amount: params.amount,
      coin_code: params.coinCode,
      original_direction: params.originalDirection,
      reversal_direction: params.reversalDirection,

      idempotency_key: params.idempotencyKey ?? null,
      dedupe_key: params.dedupeKey ?? null,

      source_event_ids: params.sourceEventIds ?? [],
      reason_codes: params.reasonCodes ?? [],

      requires_review: params.requiresReview ?? false,
      actor_user_id: params.actorUserId ?? null,

      safety_scores: params.safetyScores ?? {},
      metadata: params.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getCompensationRecordDb(compensationId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("compensation_records")
    .select("*")
    .eq("compensation_id", compensationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCompensationsForOriginalLedgerDb(originalLedgerEntryId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("compensation_records")
    .select("*")
    .eq("original_ledger_entry_id", originalLedgerEntryId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateCompensationRecordDb(params: {
  compensationId: string;
  status?: string;
  reversalLedgerEntryId?: string | null;
  reversalAuditRecordId?: string | null;
  reversalNotificationId?: string | null;
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const now = new Date().toISOString();

  const { data, error } = await db
    .from("compensation_records")
    .update({
      ...(params.status ? { status: params.status } : {}),
      ...(params.reversalLedgerEntryId !== undefined
        ? { reversal_ledger_entry_id: params.reversalLedgerEntryId }
        : {}),
      ...(params.reversalAuditRecordId !== undefined
        ? { reversal_audit_record_id: params.reversalAuditRecordId }
        : {}),
      ...(params.reversalNotificationId !== undefined
        ? { reversal_notification_id: params.reversalNotificationId }
        : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
      updated_at: now,
      ...(params.status === "compensation_completed" ? { completed_at: now } : {}),
      ...(params.status === "compensation_failed" ? { failed_at: now } : {}),
      ...(params.status === "compensation_canceled" ? { canceled_at: now } : {}),
      ...(params.status === "compensation_executing" ? { executed_at: now } : {}),
      ...(params.status === "compensation_ready" ? { validated_at: now } : {})
    })
    .eq("compensation_id", params.compensationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
