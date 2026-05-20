import { supabaseAdmin } from "../../config/supabase";

export async function listRevocations(input: {
  limit?: number;
  status?: string;
  sourceType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_revocation_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.sourceType) query = query.eq("source_type", input.sourceType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listRevocationNotifications(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_revocation_notification_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getRevocationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_revocation_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function revokeComplianceReport(input: {
  adminAuthUserId: string;
  complianceReportId: string;
  reasonCode: string;
  reason: string;
  publicReason?: string;
  notifyCustomers?: boolean;
  notifyAuditors?: boolean;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_compliance_report",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_compliance_report_request_id: input.complianceReportId,
      p_reason_code: input.reasonCode,
      p_reason: input.reason,
      p_public_reason: input.publicReason ?? null,
      p_notify_customers: input.notifyCustomers ?? true,
      p_notify_auditors: input.notifyAuditors ?? false,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    revocationRecordId: String(data),
    status: "revoked"
  };
}

export async function revokeQuestionnaireExport(input: {
  adminAuthUserId: string;
  questionnaireExportId: string;
  reasonCode: string;
  reason: string;
  publicReason?: string;
  notifyCustomers?: boolean;
  notifyAuditors?: boolean;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_questionnaire_export",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_questionnaire_export_id: input.questionnaireExportId,
      p_reason_code: input.reasonCode,
      p_reason: input.reason,
      p_public_reason: input.publicReason ?? null,
      p_notify_customers: input.notifyCustomers ?? true,
      p_notify_auditors: input.notifyAuditors ?? false,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    revocationRecordId: String(data),
    status: "revoked"
  };
}

export async function revokeEnterpriseRoomDocumentGrant(input: {
  adminAuthUserId: string;
  documentGrantId: string;
  reasonCode: string;
  reason: string;
  publicReason?: string;
  notifyCustomers?: boolean;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_enterprise_review_room_document_grant",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_document_grant_id: input.documentGrantId,
      p_reason_code: input.reasonCode,
      p_reason: input.reason,
      p_public_reason: input.publicReason ?? null,
      p_notify_customers: input.notifyCustomers ?? true,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    revocationRecordId: String(data),
    status: "revoked"
  };
}

export async function revokeTrustCenterReportPublication(input: {
  adminAuthUserId: string;
  trustCenterReportId: string;
  reasonCode: string;
  reason: string;
  publicReason?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_trust_center_report_publication",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_trust_center_report_id: input.trustCenterReportId,
      p_reason_code: input.reasonCode,
      p_reason: input.reason,
      p_public_reason: input.publicReason ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    revocationRecordId: String(data),
    status: "unpublished"
  };
}

export async function forceExpireArtifact(input: {
  adminAuthUserId: string;
  sourceType: string;
  sourceId: string;
  reasonCode: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "force_expire_admin_security_artifact",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_reason_code: input.reasonCode,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    revocationRecordId: String(data),
    status: "expired"
  };
}
