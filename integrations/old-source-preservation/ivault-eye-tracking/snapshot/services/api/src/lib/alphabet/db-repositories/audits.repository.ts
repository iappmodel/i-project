import { createServiceDbClient } from "../db-client";
import type { DbAuditRecord, Json } from "@/types/alphabet/database.types";

export async function insertAuditRecordDb(params: {
  auditType: string;
  status: string;
  userId?: string | null;
  actorUserId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  policyDecisionId?: string | null;
  executionRequestId?: string | null;
  sagaId?: string | null;
  pipelineId?: string | null;
  sourceEventIds?: string[];
  publicSummary?: string | null;
  internalSummary?: string | null;
  evidence?: Json;
  redactedEvidence?: Json;
  riskSummary?: Json;
  metadata?: Json;
}): Promise<DbAuditRecord> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("audit_records")
    .insert({
      audit_type: params.auditType,
      status: params.status,
      user_id: params.userId ?? null,
      actor_user_id: params.actorUserId ?? null,
      wallet_id: params.walletId ?? null,
      content_id: params.contentId ?? null,
      campaign_id: params.campaignId ?? null,
      policy_decision_id: params.policyDecisionId ?? null,
      execution_request_id: params.executionRequestId ?? null,
      saga_id: params.sagaId ?? null,
      pipeline_id: params.pipelineId ?? null,
      source_event_ids: params.sourceEventIds ?? [],
      public_summary: params.publicSummary ?? null,
      internal_summary: params.internalSummary ?? null,
      evidence: (params.evidence ?? {}) as Record<string, unknown>,
      redacted_evidence: (params.redactedEvidence ?? {}) as Record<string, unknown>,
      risk_summary: (params.riskSummary ?? {}) as Record<string, unknown>,
      metadata: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbAuditRecord;
}
