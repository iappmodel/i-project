import { supabaseAdmin } from "../../config/supabase";

export async function listAdminCorrectiveActions(input: {
  limit?: number;
  status?: string;
  priority?: string;
  incidentReviewId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_incident_corrective_action_dashboard")
    .select("*")
    .order("due_at", { ascending: true })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.priority) {
    query = query.eq("priority", input.priority);
  }

  if (input.incidentReviewId) {
    query = query.eq("admin_incident_review_id", input.incidentReviewId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getAdminCorrectiveActionIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_incident_corrective_action_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createAdminCorrectiveAction(input: {
  adminAuthUserId: string;
  incidentReviewId: string;
  actionKey: string;
  priority: string;
  title: string;
  description: string;
  assignedToAuthUserId?: string;
  dueAt?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_incident_corrective_action",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_incident_review_id: input.incidentReviewId,
      p_action_key: input.actionKey,
      p_priority: input.priority,
      p_title: input.title,
      p_description: input.description,
      p_assigned_to_auth_user_id: input.assignedToAuthUserId ?? null,
      p_due_at: input.dueAt ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminIncidentCorrectiveActionId: String(data)
  };
}

export async function assignAdminCorrectiveAction(input: {
  adminAuthUserId: string;
  correctiveActionId: string;
  assignedToAuthUserId: string;
  note?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "assign_admin_incident_corrective_action",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_corrective_action_id: input.correctiveActionId,
      p_assigned_to_auth_user_id: input.assignedToAuthUserId,
      p_note: input.note ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminIncidentCorrectiveActionId: String(data),
    status: "assigned"
  };
}

export async function startAdminCorrectiveAction(input: {
  adminAuthUserId: string;
  correctiveActionId: string;
  note?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "start_admin_incident_corrective_action",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_corrective_action_id: input.correctiveActionId,
      p_note: input.note ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminIncidentCorrectiveActionId: String(data),
    status: "in_progress"
  };
}

export async function completeAdminCorrectiveAction(input: {
  adminAuthUserId: string;
  correctiveActionId: string;
  completionNote: string;
  evidenceUrl?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "complete_admin_incident_corrective_action",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_corrective_action_id: input.correctiveActionId,
      p_completion_note: input.completionNote,
      p_evidence_url: input.evidenceUrl ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminIncidentCorrectiveActionId: String(data),
    status: "completed"
  };
}

export async function dismissAdminCorrectiveAction(input: {
  adminAuthUserId: string;
  correctiveActionId: string;
  dismissalReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "dismiss_admin_incident_corrective_action",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_corrective_action_id: input.correctiveActionId,
      p_dismissal_reason: input.dismissalReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminIncidentCorrectiveActionId: String(data),
    status: "dismissed"
  };
}
