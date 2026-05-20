import { supabaseAdmin } from "../../config/supabase";

export async function listViewerSubjects(input: {
  limit?: number;
  status?: string;
  artifactType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_viewer_subject_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.artifactType) query = query.eq("artifact_type", input.artifactType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listViewerSessions(input: { limit?: number; status?: string }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_viewer_session_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listViewerRenderJobs(input: { limit?: number; status?: string }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_viewer_render_job_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listViewerAccessEvents(input: { limit?: number; status?: string }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_viewer_access_event_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getViewerIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_artifact_viewer_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function queueViewerRenderJob(input: {
  viewerSubjectId: string;
  renderMode?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "queue_admin_security_artifact_viewer_render_job",
    {
      p_viewer_subject_id: input.viewerSubjectId,
      p_render_mode: input.renderMode ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    viewerRenderJobId: String(data),
    status: "pending"
  };
}

export async function createViewerSession(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_artifact_viewer_session",
    {
      p_viewer_subject_id: input.viewerSubjectId,
      p_viewer_scope: input.viewerScope,
      p_requester_auth_user_id: input.requesterAuthUserId ?? null,
      p_requester_email: input.requesterEmail ?? null,
      p_requester_display_name: input.requesterDisplayName ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_private_room_participant_id: input.privateRoomParticipantId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_auditor_participant_id: input.auditorParticipantId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_expires_in_minutes: input.expiresInMinutes ?? 30,
      p_max_page_views: input.maxPageViews ?? 200,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return data;
}
