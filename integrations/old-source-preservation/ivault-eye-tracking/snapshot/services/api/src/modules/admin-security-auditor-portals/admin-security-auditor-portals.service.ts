import { supabaseAdmin } from "../../config/supabase";

export async function listAuditorPortals(input: { limit?: number; status?: string }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_auditor_portal_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listAuditorEvidencePackets(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_auditor_evidence_packet_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listAuditorQuestions(input: { limit?: number; status?: string }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_auditor_question_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getAuditorPortalIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_portal_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listAuditorPacketManifests(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_auditor_packet_manifest_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listAuditorPacketDownloads(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_auditor_packet_download_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getAuditorPacketDownloadIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_packet_download_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAuditorPortal(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_auditor_portal",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_auditor_name: input.auditorName,
      p_auditor_domain: input.auditorDomain ?? null,
      p_auditor_firm: input.auditorFirm ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_audit_type: input.auditType ?? "security_review",
      p_audit_scope: input.auditScope,
      p_title: input.title,
      p_summary: input.summary,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_audit_period_id: input.auditPeriodId ?? null,
      p_access_starts_at: input.accessStartsAt ?? null,
      p_access_expires_at: input.accessExpiresAt ?? null,
      p_require_acknowledgement: input.requireAcknowledgement ?? true,
      p_allow_downloads: input.allowDownloads ?? true,
      p_allow_questions: input.allowQuestions ?? true,
      p_allow_timeline_access: input.allowTimelineAccess ?? true,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { auditorPortalId: String(data), status: "draft" };
}

export async function inviteAuditorParticipant(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "invite_admin_security_auditor_portal_participant",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_auditor_portal_id: input.auditorPortalId,
      p_email: input.email,
      p_display_name: input.displayName ?? null,
      p_participant_role: input.participantRole ?? "auditor",
      p_auth_user_id: input.authUserId ?? null,
      p_organization_name: input.organizationName ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { auditorPortalParticipantId: String(data), status: "invited" };
}

export async function publishAuditorPortal(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "publish_admin_security_auditor_portal",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_auditor_portal_id: input.auditorPortalId,
      p_note: input.note,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { auditorPortalId: String(data), status: "published" };
}

export async function createEvidencePacket(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_auditor_evidence_packet",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_auditor_portal_id: input.auditorPortalId,
      p_packet_type: input.packetType ?? "evidence_packet",
      p_title: input.title,
      p_summary: input.summary,
      p_scope: input.scope,
      p_disclosure_package_id: input.disclosurePackageId ?? null,
      p_compliance_report_request_id: input.complianceReportRequestId ?? null,
      p_questionnaire_export_id: input.questionnaireExportId ?? null,
      p_audit_period_export_request_id: input.auditPeriodExportRequestId ?? null,
      p_allow_download: input.allowDownload ?? true,
      p_require_acknowledgement: input.requireAcknowledgement ?? true,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { auditorEvidencePacketId: String(data), status: "draft" };
}

export async function addEvidencePacketItem(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "add_admin_security_auditor_evidence_packet_item",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_evidence_packet_id: input.evidencePacketId,
      p_item_type: input.itemType,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId ?? null,
      p_display_title: input.displayTitle,
      p_display_summary: input.displaySummary,
      p_item_key: input.itemKey ?? null,
      p_control_key: input.controlKey ?? null,
      p_framework_key: input.frameworkKey ?? null,
      p_checksum_sha256: input.checksumSha256 ?? null,
      p_signature: input.signature ?? null,
      p_signed_at: input.signedAt ?? null,
      p_public_safe: input.publicSafe ?? true,
      p_auditor_safe: input.auditorSafe ?? true,
      p_allow_download: input.allowDownload ?? false,
      p_sort_order: input.sortOrder ?? 0,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { auditorEvidencePacketItemId: String(data) };
}

export async function publishEvidencePacket(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "publish_admin_security_auditor_evidence_packet",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_evidence_packet_id: input.evidencePacketId,
      p_note: input.note,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { auditorEvidencePacketId: String(data), status: "published" };
}

export async function answerAuditorQuestion(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "answer_admin_security_auditor_question",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_auditor_question_id: input.auditorQuestionId,
      p_answer_text: input.answerText,
      p_internal_note: input.internalNote ?? null,
      p_close_question: input.closeQuestion ?? true,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return {
    auditorQuestionId: String(data),
    status: input.closeQuestion ? "closed" : "answered"
  };
}
