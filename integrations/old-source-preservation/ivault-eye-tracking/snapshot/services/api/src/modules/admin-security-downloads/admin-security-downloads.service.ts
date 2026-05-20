import { supabaseAdmin } from "../../config/supabase";

type DownloadFilters = {
  limit?: number;
  status?: string;
  artifactType?: string;
};

export async function listDownloadSubjects(input: DownloadFilters) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_download_subject_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.artifactType) query = query.eq("artifact_type", input.artifactType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listDownloadGrants(input: DownloadFilters) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_download_grant_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listDownloadAttempts(input: DownloadFilters) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_artifact_download_attempt_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getDownloadIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_artifact_download_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

type CreateDownloadGrantInput = {
  adminAuthUserId: string;
  downloadSubjectId: string;
  grantScope: string;
  grantedToAuthUserId?: string;
  grantedToEmail?: string;
  grantedToDisplayName?: string;
  grantedToParticipantId?: string;
  privateRoomId?: string;
  privateRoomParticipantId?: string;
  auditorPortalId?: string;
  auditorParticipantId?: string;
  enterpriseReviewRoomId?: string;
  maxDownloads?: number;
  expiresInMinutes?: number;
  userAgentHint?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function createDownloadGrant(input: CreateDownloadGrantInput) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_artifact_download_grant",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_download_subject_id: input.downloadSubjectId,
      p_grant_scope: input.grantScope,
      p_granted_to_auth_user_id: input.grantedToAuthUserId ?? null,
      p_granted_to_email: input.grantedToEmail ?? null,
      p_granted_to_display_name: input.grantedToDisplayName ?? null,
      p_granted_to_participant_id: input.grantedToParticipantId ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_private_room_participant_id: input.privateRoomParticipantId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_auditor_participant_id: input.auditorParticipantId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_max_downloads: input.maxDownloads ?? 3,
      p_expires_in_minutes: input.expiresInMinutes ?? 15,
      p_ip_allowlist: null,
      p_user_agent_hint: input.userAgentHint ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return data;
}

type RevokeDownloadGrantInput = {
  adminAuthUserId: string;
  downloadGrantId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function revokeDownloadGrant(input: RevokeDownloadGrantInput) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_artifact_download_grant",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_download_grant_id: input.downloadGrantId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    downloadGrantId: String(data),
    status: "revoked"
  };
}
