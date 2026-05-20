import { supabaseAdmin } from "../../config/supabase";

export async function listTrustProofReports(input: {
  limit?: number;
  status?: string;
  reportScope?: string;
  customerName?: string;
  privateRoomId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_proof_report_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.reportScope) query = query.eq("report_scope", input.reportScope);
  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.privateRoomId) query = query.eq("private_room_id", input.privateRoomId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustProofReportSections(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_proof_report_section_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listTrustProofReportItems(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_proof_report_item_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listTrustProofReportFiles(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_proof_report_file_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listTrustProofReportJobs(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_proof_report_job_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrustProofReportIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_proof_report_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTrustProofReport(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_trust_proof_report",
    {
      p_report_scope: input.reportScope,
      p_report_type: input.reportType ?? "customer_security_review",
      p_report_format: input.reportFormat ?? "html",
      p_title: input.title ?? null,
      p_subtitle: input.subtitle ?? null,
      p_executive_summary: input.executiveSummary ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_private_room_participant_id: input.privateRoomParticipantId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_auditor_participant_id: input.auditorParticipantId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_requester_auth_user_id: input.requesterAuthUserId ?? null,
      p_requester_email: input.requesterEmail ?? null,
      p_requester_display_name: input.requesterDisplayName ?? null,
      p_start_time: input.startTime ?? null,
      p_end_time: input.endTime ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    trustProofReportId: String(data),
    status: "pending"
  };
}

export async function revokeTrustProofReport(input: {
  adminAuthUserId: string;
  reportId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_trust_proof_report",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_report_id: input.reportId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    trustProofReportId: String(data),
    status: "revoked"
  };
}
