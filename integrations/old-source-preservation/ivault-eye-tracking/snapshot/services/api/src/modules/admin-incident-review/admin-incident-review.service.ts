import { supabaseAdmin } from "../../config/supabase";

export async function listAdminIncidentReviews(input: {
  limit?: number;
  status?: string;
  severity?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_incident_review_dashboard")
    .select("*")
    .order("due_at", { ascending: true })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.severity) {
    query = query.eq("severity", input.severity);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getAdminIncidentReviewIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_incident_review_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function assignAdminIncidentReview(input: {
  adminAuthUserId: string;
  incidentReviewId: string;
  assignedToAuthUserId: string;
  note?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("assign_admin_incident_review", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_incident_review_id: input.incidentReviewId,
    p_assigned_to_auth_user_id: input.assignedToAuthUserId,
    p_note: input.note ?? null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminIncidentReviewId: String(data),
    status: "assigned"
  };
}

export async function startAdminIncidentReviewInvestigation(input: {
  adminAuthUserId: string;
  incidentReviewId: string;
  note?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "start_admin_incident_review_investigation",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_incident_review_id: input.incidentReviewId,
      p_note: input.note ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminIncidentReviewId: String(data),
    status: "investigating"
  };
}

export async function closeAdminIncidentReview(input: {
  adminAuthUserId: string;
  incidentReviewId: string;
  closureReason: string;
  findings: string;
  correctiveActions: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("close_admin_incident_review", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_incident_review_id: input.incidentReviewId,
    p_closure_reason: input.closureReason,
    p_findings: input.findings,
    p_corrective_actions: input.correctiveActions,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminIncidentReviewId: String(data),
    status: "closed"
  };
}

export async function dismissAdminIncidentReview(input: {
  adminAuthUserId: string;
  incidentReviewId: string;
  dismissalReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("dismiss_admin_incident_review", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_incident_review_id: input.incidentReviewId,
    p_dismissal_reason: input.dismissalReason,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminIncidentReviewId: String(data),
    status: "dismissed"
  };
}
