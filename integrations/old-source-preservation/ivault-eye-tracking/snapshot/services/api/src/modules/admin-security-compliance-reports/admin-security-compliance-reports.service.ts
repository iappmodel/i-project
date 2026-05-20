import { supabaseAdmin } from "../../config/supabase";

export async function listComplianceReports(input: {
  limit?: number;
  status?: string;
  auditPeriodId?: string;
  reportType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_compliance_report_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.auditPeriodId) query = query.eq("audit_period_id", input.auditPeriodId);
  if (input.reportType) query = query.eq("report_type", input.reportType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listComplianceReportSections(input: {
  reportRequestId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_compliance_report_section_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.reportRequestId) {
    query = query.eq("compliance_report_request_id", input.reportRequestId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listComplianceReportEvidence(input: {
  reportRequestId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_compliance_report_evidence_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.reportRequestId) {
    query = query.eq("compliance_report_request_id", input.reportRequestId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getComplianceReportIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_compliance_report_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requestComplianceReport(input: {
  adminAuthUserId: string;
  auditPeriodId: string;
  auditPeriodExportRequestId?: string;
  reportType?: string;
  reportFormat?: string;
  reportTitle?: string;
  reportAudience?: string;
  requestedForAuditorId?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "request_admin_security_compliance_report",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_audit_period_id: input.auditPeriodId,
      p_audit_period_export_request_id: input.auditPeriodExportRequestId ?? null,
      p_report_type: input.reportType ?? "audit_period_executive_summary",
      p_report_format: input.reportFormat ?? "markdown",
      p_report_title: input.reportTitle ?? null,
      p_report_audience: input.reportAudience ?? "internal",
      p_requested_for_auditor_id: input.requestedForAuditorId ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityComplianceReportRequestId: String(data),
    status: "pending"
  };
}

export async function approveComplianceReport(input: {
  adminAuthUserId: string;
  reportRequestId: string;
  approvalNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_security_compliance_report",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_compliance_report_request_id: input.reportRequestId,
      p_approval_note: input.approvalNote,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityComplianceReportRequestId: String(data),
    status: "approved"
  };
}

export async function registerComplianceReportDownload(input: {
  authUserId: string;
  reportRequestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_admin_security_compliance_report_download",
    {
      p_auth_user_id: input.authUserId,
      p_compliance_report_request_id: input.reportRequestId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  const item = Array.isArray(data) ? data[0] : data;

  return {
    complianceReportRequestId: item.compliance_report_request_id,
    reportKey: item.report_key,
    storageUri: item.storage_uri,
    checksumSha256: item.checksum_sha256,
    payloadBytes: item.payload_bytes,
    signatureAlgorithm: item.signature_algorithm,
    signingKeyVersion: item.signing_key_version,
    signature: item.signature,
    watermark: item.watermark,
    expiresAt: item.expires_at
  };
}
