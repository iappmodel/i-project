import { supabaseAdmin } from "../../config/supabase";

export async function requestAuditorExport(input: {
  auditorAuthUserId: string;
  exportType: string;
  exportFormat?: string;
  frameworkKey?: string;
  controlKey?: string;
  periodStart?: string;
  periodEnd?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "request_admin_security_auditor_export",
    {
      p_auditor_auth_user_id: input.auditorAuthUserId,
      p_export_type: input.exportType,
      p_framework_key: input.frameworkKey ?? null,
      p_control_key: input.controlKey ?? null,
      p_period_start: input.periodStart ?? null,
      p_period_end: input.periodEnd ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        ...(input.metadata ?? {}),
        requestedExportFormat: input.exportFormat ?? "json"
      }
    }
  );

  if (error) throw error;

  if (input.exportFormat && input.exportFormat !== "json") {
    await supabaseAdmin
      .from("admin_security_auditor_export_requests")
      .update({ export_format: input.exportFormat })
      .eq("id", data);
  }

  return {
    adminSecurityAuditorExportRequestId: String(data),
    status: "pending"
  };
}

export async function registerAuditorExportDownload(input: {
  auditorAuthUserId: string;
  exportRequestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_admin_security_auditor_export_download",
    {
      p_auditor_auth_user_id: input.auditorAuthUserId,
      p_export_request_id: input.exportRequestId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  const item = Array.isArray(data) ? data[0] : data;
  return {
    exportRequestId: item.export_request_id,
    exportKey: item.export_key,
    storageUri: item.storage_uri,
    checksumSha256: item.checksum_sha256,
    payloadBytes: item.payload_bytes,
    watermark: item.watermark,
    expiresAt: item.expires_at
  };
}

export async function listAdminAuditorExports(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_auditor_export_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return {
    items: data ?? []
  };
}

export async function approveAdminAuditorExport(input: {
  adminAuthUserId: string;
  exportRequestId: string;
  approvalNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_security_auditor_export",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_export_request_id: input.exportRequestId,
      p_approval_note: input.approvalNote,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityAuditorExportRequestId: String(data),
    status: "approved"
  };
}

export async function listAuditorPortalCoverage(input: {
  auditorAuthUserId: string;
  frameworkKey?: string;
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("list_auditor_control_coverage", {
    p_auditor_auth_user_id: input.auditorAuthUserId,
    p_framework_key: input.frameworkKey ?? null,
    p_limit: input.limit ?? 100,
    p_request_id: input.requestId
  });

  if (error) throw error;
  return data ?? [];
}

export async function listAuditorPortalEvidence(input: {
  auditorAuthUserId: string;
  frameworkKey?: string;
  controlKey?: string;
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("list_auditor_evidence", {
    p_auditor_auth_user_id: input.auditorAuthUserId,
    p_framework_key: input.frameworkKey ?? null,
    p_control_key: input.controlKey ?? null,
    p_limit: input.limit ?? 100,
    p_request_id: input.requestId
  });

  if (error) throw error;
  return data ?? [];
}

export async function listAuditorPortalPolicies(input: {
  auditorAuthUserId: string;
  category?: string;
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("list_auditor_policies", {
    p_auditor_auth_user_id: input.auditorAuthUserId,
    p_category: input.category ?? null,
    p_limit: input.limit ?? 100,
    p_request_id: input.requestId
  });

  if (error) throw error;
  return data ?? [];
}
