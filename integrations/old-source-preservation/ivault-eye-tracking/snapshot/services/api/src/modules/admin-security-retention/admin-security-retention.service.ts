import { supabaseAdmin } from "../../config/supabase";

export async function listRetentionSubjects(input: {
  limit?: number;
  status?: string;
  sourceType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_retention_subject_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.sourceType) query = query.eq("source_type", input.sourceType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listLegalHolds(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_legal_hold_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listRetentionDecisions(input: {
  limit?: number;
  sourceType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_retention_decision_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.sourceType) query = query.eq("source_type", input.sourceType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getRetentionIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_retention_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function registerRetentionSubject(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_admin_security_retention_subject",
    {
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_subject_title: input.subjectTitle,
      p_subject_summary: input.subjectSummary ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_artifact_key: input.artifactKey ?? null,
      p_checksum_sha256: input.checksumSha256 ?? null,
      p_signature: input.signature ?? null,
      p_first_seen_at: input.firstSeenAt ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    retentionSubjectId: String(data),
    status: "registered"
  };
}

export async function discoverRetentionSubjects(input: {
  batchSize?: number;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "discover_admin_security_retention_subjects",
    {
      p_batch_size: input.batchSize ?? 1000,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    runId: String(data)
  };
}

export async function runRetentionLifecycle(input: {
  batchSize?: number;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "run_admin_security_retention_lifecycle_job",
    {
      p_batch_size: input.batchSize ?? 1000,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    runId: String(data)
  };
}

export async function placeLegalHold(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "place_admin_security_legal_hold",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_hold_type: input.holdType ?? "legal",
      p_title: input.title,
      p_reason: input.reason,
      p_case_reference: input.caseReference ?? null,
      p_external_reference: input.externalReference ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    legalHoldId: String(data),
    status: "active"
  };
}

export async function releaseLegalHold(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "release_admin_security_legal_hold",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_legal_hold_id: input.legalHoldId,
      p_release_reason: input.releaseReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    legalHoldId: String(data),
    status: "released"
  };
}

export async function executeRetentionDeletion(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "execute_admin_security_retention_deletion",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_retention_subject_id: input.retentionSubjectId,
      p_reason: input.reason,
      p_second_admin_approval_request_id: input.secondAdminApprovalRequestId ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    retentionDecisionId: String(data),
    status: "deleted"
  };
}
