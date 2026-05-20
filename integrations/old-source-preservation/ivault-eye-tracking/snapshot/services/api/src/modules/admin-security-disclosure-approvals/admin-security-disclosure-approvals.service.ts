import { supabaseAdmin } from "../../config/supabase";

export async function listDisclosureApprovals(input: {
  limit?: number;
  status?: string;
  disclosureType?: string;
  sourceType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_disclosure_approval_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.disclosureType) query = query.eq("disclosure_type", input.disclosureType);
  if (input.sourceType) query = query.eq("source_type", input.sourceType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listDisclosureApprovalDecisions(input: {
  approvalRequestId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_disclosure_approval_decision_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.approvalRequestId) {
    query = query.eq("approval_request_id", input.approvalRequestId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getDisclosureApprovalIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_disclosure_approval_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createDisclosureApproval(input: {
  adminAuthUserId: string;
  disclosureType: string;
  riskLevel?: string;
  sourceType: string;
  sourceId: string;
  title: string;
  summary: string;
  requestedAction: string;
  customerName?: string;
  enterpriseReviewRoomId?: string;
  expiresAt?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_disclosure_approval_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_disclosure_type: input.disclosureType,
      p_risk_level: input.riskLevel ?? "medium",
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_title: input.title,
      p_summary: input.summary,
      p_requested_action: input.requestedAction,
      p_customer_name: input.customerName ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_expires_at: input.expiresAt ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    disclosureApprovalRequestId: String(data),
    status: "pending"
  };
}

export async function decideDisclosureApproval(input: {
  adminAuthUserId: string;
  approvalRequestId: string;
  decision: string;
  approvalRole: string;
  note: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "decide_admin_security_disclosure_approval_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_approval_request_id: input.approvalRequestId,
      p_decision: input.decision,
      p_approval_role: input.approvalRole,
      p_note: input.note,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    disclosureApprovalRequestId: String(data),
    decision: input.decision
  };
}
