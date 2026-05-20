import { supabaseAdmin } from "../../config/supabase";

export async function listSearchDocuments(input: {
  limit?: number;
  status?: string;
  artifactType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_search_document_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.artifactType) query = query.eq("artifact_type", input.artifactType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listSearchChunks(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_artifact_search_chunk_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listSearchSessions(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_search_session_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listSearchQueries(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_search_query_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSearchIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_artifact_search_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function registerSearchDocument(input: {
  viewerSubjectId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_admin_security_artifact_search_document",
    {
      p_viewer_subject_id: input.viewerSubjectId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    searchDocumentId: String(data),
    status: "pending"
  };
}

export async function createSearchSession(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_artifact_search_session",
    {
      p_search_scope: input.searchScope,
      p_requester_auth_user_id: input.requesterAuthUserId ?? null,
      p_requester_email: input.requesterEmail ?? null,
      p_requester_display_name: input.requesterDisplayName ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_private_room_participant_id: input.privateRoomParticipantId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_auditor_participant_id: input.auditorParticipantId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_expires_in_minutes: input.expiresInMinutes ?? 60,
      p_max_queries: input.maxQueries ?? 100,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return data;
}

export async function executeSearch(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "execute_admin_security_artifact_search",
    {
      p_search_token: input.searchToken,
      p_query_text: input.queryText,
      p_query_type: input.queryType ?? "keyword",
      p_limit: input.limit ?? 20,
      p_auth_user_id: input.authUserId ?? null,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return data;
}
