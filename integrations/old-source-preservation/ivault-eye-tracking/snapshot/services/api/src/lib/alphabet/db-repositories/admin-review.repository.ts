import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function insertAdminReviewCaseDb(params: {
  reviewCaseId?: string;
  reviewCaseType: string;
  reviewTrigger: string;
  status: string;
  decision?: string | null;

  userId?: string | null;
  actorUserId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  providerReconciliationId?: string | null;

  rawEvidence?: Json;
  redactedEvidence?: Json;
  publicSummary?: string | null;
  internalSummary?: string | null;

  assignedReviewerId?: string | null;
  assignedTeam?: string | null;
  assignedAt?: string | null;

  severity?: string;
  priority?: string;

  dueAt?: string | null;
  breachedAt?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds?: string[];

  decisionReasonCodes?: string[];
  decisionNotes?: string | null;

  safetyScores?: Json;
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const row: Record<string, unknown> = {
    review_case_type: params.reviewCaseType,
    review_trigger: params.reviewTrigger,
    status: params.status,
    decision: params.decision ?? null,

    user_id: params.userId ?? null,
    actor_user_id: params.actorUserId ?? null,
    wallet_id: params.walletId ?? null,
    content_id: params.contentId ?? null,
    campaign_id: params.campaignId ?? null,
    grant_eligibility_id: params.grantEligibilityId ?? null,
    external_transfer_id: params.externalTransferId ?? null,
    compensation_id: params.compensationId ?? null,
    policy_decision_id: params.policyDecisionId ?? null,
    pipeline_id: params.pipelineId ?? null,
    saga_id: params.sagaId ?? null,
    execution_request_id: params.executionRequestId ?? null,
    provider_reconciliation_id: params.providerReconciliationId ?? null,

    raw_evidence: params.rawEvidence ?? {},
    redacted_evidence: params.redactedEvidence ?? {},
    public_summary: params.publicSummary ?? null,
    internal_summary: params.internalSummary ?? null,

    assigned_reviewer_id: params.assignedReviewerId ?? null,
    assigned_team: params.assignedTeam ?? null,
    assigned_at: params.assignedAt ?? (params.assignedReviewerId ? new Date().toISOString() : null),

    severity: params.severity ?? "medium",
    priority: params.priority ?? "normal",

    due_at: params.dueAt ?? null,
    breached_at: params.breachedAt ?? null,

    idempotency_key: params.idempotencyKey ?? null,
    dedupe_key: params.dedupeKey ?? null,

    source_event_ids: params.sourceEventIds ?? [],

    decision_reason_codes: params.decisionReasonCodes ?? [],
    decision_notes: params.decisionNotes ?? null,

    safety_scores: params.safetyScores ?? {},
    metadata: params.metadata ?? {}
  };

  if (params.reviewCaseId) {
    row.review_case_id = params.reviewCaseId;
  }

  const { data, error } = await db.from("admin_review_cases").insert(row).select("*").single();

  if (error) throw error;
  return data;
}

export async function getAdminReviewCaseByIdempotencyKeyDb(idempotencyKey: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("admin_review_cases")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

const OPEN_ADMIN_REVIEW_STATUSES = [
  "review_created",
  "review_queued",
  "review_assigned",
  "review_in_progress",
  "review_needs_more_info",
  "review_escalated"
] as const;

export async function countOpenAdminReviewCasesByDedupeKeyDb(dedupeKey: string): Promise<number> {
  if (!dedupeKey) return 0;

  const db = createServiceDbClient();

  const { count, error } = await db
    .from("admin_review_cases")
    .select("review_case_id", { count: "exact", head: true })
    .eq("dedupe_key", dedupeKey)
    .in("status", [...OPEN_ADMIN_REVIEW_STATUSES]);

  if (error) throw error;
  return count ?? 0;
}

export async function getAdminReviewCaseDb(reviewCaseId: string) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("admin_review_cases")
    .select("*")
    .eq("review_case_id", reviewCaseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listAdminReviewCasesDb(params?: {
  status?: string;
  assignedReviewerId?: string;
  limit?: number;
}) {
  const db = createServiceDbClient();

  let query = db
    .from("admin_review_cases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 50);

  if (params?.status) query = query.eq("status", params.status);
  if (params?.assignedReviewerId) {
    query = query.eq("assigned_reviewer_id", params.assignedReviewerId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function assignAdminReviewCaseDb(params: {
  reviewCaseId: string;
  assignedReviewerId: string;
  assignedTeam?: string | null;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("admin_review_cases")
    .update({
      status: "review_assigned",
      assigned_reviewer_id: params.assignedReviewerId,
      assigned_team: params.assignedTeam ?? null,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("review_case_id", params.reviewCaseId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminReviewCaseStatusDb(params: {
  reviewCaseId: string;
  status: string;
  metadata?: Json;
}) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("admin_review_cases")
    .update({
      status: params.status,
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
      updated_at: now
    })
    .eq("review_case_id", params.reviewCaseId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminReviewDecisionDb(params: {
  reviewCaseId: string;
  status: string;
  decision: string;
  decidedByUserId: string;
  decisionReasonCodes: string[];
  decisionNotes?: string | null;
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const now = new Date().toISOString();

  const terminalClosedStatuses = new Set(["review_approved", "review_rejected", "review_closed"]);
  const canceled = params.status === "review_canceled";

  const { data, error } = await db
    .from("admin_review_cases")
    .update({
      status: params.status,
      decision: params.decision,
      decided_by_user_id: params.decidedByUserId,
      decided_at: now,
      decision_reason_codes: params.decisionReasonCodes,
      decision_notes: params.decisionNotes ?? null,
      metadata: params.metadata ?? {},
      updated_at: now,
      closed_at: terminalClosedStatuses.has(params.status) ? now : null,
      canceled_at: canceled ? now : null
    })
    .eq("review_case_id", params.reviewCaseId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
