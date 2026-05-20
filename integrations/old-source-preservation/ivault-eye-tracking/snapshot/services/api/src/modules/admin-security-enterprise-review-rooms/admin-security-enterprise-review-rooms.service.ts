import { supabaseAdmin } from "../../config/supabase";

export async function listEnterpriseReviewRooms(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_enterprise_review_room_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listEnterpriseReviewRoomParticipants(input: {
  reviewRoomId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_enterprise_review_room_participant_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.reviewRoomId) query = query.eq("review_room_id", input.reviewRoomId);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listEnterpriseReviewRoomDocuments(input: {
  reviewRoomId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_enterprise_review_room_document_grant_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.reviewRoomId) query = query.eq("review_room_id", input.reviewRoomId);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getEnterpriseReviewRoomIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_enterprise_review_room_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createEnterpriseReviewRoom(input: {
  adminAuthUserId: string;
  customerName: string;
  customerDomain?: string;
  customerExternalId?: string;
  roomTitle: string;
  roomSummary: string;
  reviewType?: string;
  salesOwnerAuthUserId?: string;
  securityOwnerAuthUserId?: string;
  accessStartsAt?: string;
  accessExpiresAt: string;
  requireNda?: boolean;
  requireEmailDomainMatch?: boolean;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_enterprise_review_room",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_customer_name: input.customerName,
      p_customer_domain: input.customerDomain ?? null,
      p_customer_external_id: input.customerExternalId ?? null,
      p_room_title: input.roomTitle,
      p_room_summary: input.roomSummary,
      p_review_type: input.reviewType ?? "enterprise_security_review",
      p_sales_owner_auth_user_id: input.salesOwnerAuthUserId ?? null,
      p_security_owner_auth_user_id: input.securityOwnerAuthUserId ?? null,
      p_access_starts_at: input.accessStartsAt ?? null,
      p_access_expires_at: input.accessExpiresAt,
      p_require_nda: input.requireNda ?? true,
      p_require_email_domain_match: input.requireEmailDomainMatch ?? false,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    enterpriseReviewRoomId: String(data),
    status: "draft"
  };
}

export async function publishEnterpriseReviewRoom(input: {
  adminAuthUserId: string;
  reviewRoomId: string;
  note: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "publish_admin_security_enterprise_review_room",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_review_room_id: input.reviewRoomId,
      p_note: input.note,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    enterpriseReviewRoomId: String(data),
    status: "published"
  };
}

export async function inviteEnterpriseReviewRoomParticipant(input: {
  adminAuthUserId: string;
  reviewRoomId: string;
  email: string;
  displayName?: string;
  organizationName?: string;
  participantType?: string;
  roleTitle?: string;
  authUserId?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "invite_admin_security_enterprise_review_room_participant",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_review_room_id: input.reviewRoomId,
      p_email: input.email,
      p_display_name: input.displayName ?? null,
      p_organization_name: input.organizationName ?? null,
      p_participant_type: input.participantType ?? "customer_reviewer",
      p_role_title: input.roleTitle ?? null,
      p_auth_user_id: input.authUserId ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    enterpriseReviewRoomParticipantId: String(data)
  };
}

export async function grantEnterpriseReviewRoomDocument(input: {
  adminAuthUserId: string;
  reviewRoomId: string;
  documentType: string;
  displayTitle: string;
  displaySummary: string;
  complianceReportRequestId?: string;
  auditPeriodExportRequestId?: string;
  trustCenterReportId?: string;
  visibility?: string;
  allowDownload?: boolean;
  allowPublicVerification?: boolean;
  accessStartsAt?: string;
  accessExpiresAt?: string;
  sortOrder?: number;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "grant_admin_security_enterprise_review_room_document",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_review_room_id: input.reviewRoomId,
      p_document_type: input.documentType,
      p_display_title: input.displayTitle,
      p_display_summary: input.displaySummary,
      p_compliance_report_request_id: input.complianceReportRequestId ?? null,
      p_audit_period_export_request_id: input.auditPeriodExportRequestId ?? null,
      p_trust_center_report_id: input.trustCenterReportId ?? null,
      p_visibility: input.visibility ?? "room_only",
      p_allow_download: input.allowDownload ?? true,
      p_allow_public_verification: input.allowPublicVerification ?? true,
      p_access_starts_at: input.accessStartsAt ?? null,
      p_access_expires_at: input.accessExpiresAt ?? null,
      p_sort_order: input.sortOrder ?? 0,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    enterpriseReviewRoomDocumentGrantId: String(data)
  };
}

export async function revokeEnterpriseReviewRoom(input: {
  adminAuthUserId: string;
  reviewRoomId: string;
  revokeReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_enterprise_review_room",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_review_room_id: input.reviewRoomId,
      p_revoke_reason: input.revokeReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    enterpriseReviewRoomId: String(data),
    status: "revoked"
  };
}

export async function acceptEnterpriseReviewRoomNda(input: {
  authUserId: string;
  roomKey: string;
  email: string;
  ndaVersion: string;
  requestIp?: string;
  userAgent?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("accept_enterprise_review_room_nda", {
    p_auth_user_id: input.authUserId,
    p_room_key: input.roomKey,
    p_email: input.email,
    p_nda_version: input.ndaVersion,
    p_ip_address: input.requestIp ?? null,
    p_user_agent: input.userAgent ?? null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    enterpriseReviewRoomParticipantId: String(data),
    ndaStatus: "accepted"
  };
}

export async function getEnterpriseReviewRoomForParticipant(input: {
  authUserId: string;
  roomKey: string;
  requestIp?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_enterprise_review_room_for_participant",
    {
      p_auth_user_id: input.authUserId,
      p_room_key: input.roomKey,
      p_ip_address: input.requestIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId
    }
  );

  if (error) throw error;

  return data;
}

export async function downloadEnterpriseReviewRoomDocument(input: {
  authUserId: string;
  roomKey: string;
  documentGrantId: string;
  requestIp?: string;
  userAgent?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_enterprise_review_room_document_download",
    {
      p_auth_user_id: input.authUserId,
      p_room_key: input.roomKey,
      p_document_grant_id: input.documentGrantId,
      p_ip_address: input.requestIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return data;
}
