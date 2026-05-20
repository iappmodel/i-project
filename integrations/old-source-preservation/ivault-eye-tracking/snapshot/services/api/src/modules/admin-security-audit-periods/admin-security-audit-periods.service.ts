import { supabaseAdmin } from "../../config/supabase";

export async function listAuditPeriods(input: {
  limit?: number;
  status?: string;
  auditType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_audit_period_dashboard")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.auditType) query = query.eq("audit_type", input.auditType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAuditSnapshots(input: {
  auditPeriodId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_audit_period_snapshot_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.auditPeriodId) query = query.eq("audit_period_id", input.auditPeriodId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAuditSnapshotItems(input: {
  auditPeriodId?: string;
  snapshotId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_audit_period_snapshot_item_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.auditPeriodId) query = query.eq("audit_period_id", input.auditPeriodId);
  if (input.snapshotId) query = query.eq("audit_period_snapshot_id", input.snapshotId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAuditPeriodIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_audit_period_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAuditPeriod(input: {
  adminAuthUserId: string;
  periodKey: string;
  periodName: string;
  auditType: string;
  periodStart: string;
  periodEnd: string;
  description: string;
  ownerTeam?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("create_admin_security_audit_period", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_period_key: input.periodKey,
    p_period_name: input.periodName,
    p_audit_type: input.auditType,
    p_period_start: input.periodStart,
    p_period_end: input.periodEnd,
    p_description: input.description,
    p_owner_team: input.ownerTeam ?? "platform",
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAuditPeriodId: String(data),
    status: "draft"
  };
}

export async function openAuditPeriod(input: {
  adminAuthUserId: string;
  auditPeriodId: string;
  note?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("open_admin_security_audit_period", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_audit_period_id: input.auditPeriodId,
    p_note: input.note ?? null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAuditPeriodId: String(data),
    status: "open"
  };
}

export async function closeAuditPeriod(input: {
  adminAuthUserId: string;
  auditPeriodId: string;
  note: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("close_admin_security_audit_period", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_audit_period_id: input.auditPeriodId,
    p_note: input.note,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAuditPeriodId: String(data),
    status: "closed"
  };
}

export async function buildAuditSnapshot(input: {
  adminAuthUserId: string;
  auditPeriodId: string;
  snapshotType: string;
  snapshotKey: string;
  snapshotName: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("build_admin_security_audit_period_snapshot", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_audit_period_id: input.auditPeriodId,
    p_snapshot_type: input.snapshotType,
    p_snapshot_key: input.snapshotKey,
    p_snapshot_name: input.snapshotName,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAuditPeriodSnapshotId: String(data),
    status: "built"
  };
}

export async function sealAuditSnapshot(input: {
  adminAuthUserId: string;
  snapshotId: string;
  note: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("seal_admin_security_audit_period_snapshot", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_snapshot_id: input.snapshotId,
    p_note: input.note,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAuditPeriodSnapshotId: String(data),
    status: "sealed"
  };
}

export async function sealAuditPeriod(input: {
  adminAuthUserId: string;
  auditPeriodId: string;
  note: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("seal_admin_security_audit_period", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_audit_period_id: input.auditPeriodId,
    p_note: input.note,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAuditPeriodId: String(data),
    status: "sealed"
  };
}

export async function listAuditPeriodExports(input: {
  limit?: number;
  status?: string;
  auditPeriodId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_audit_period_export_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.auditPeriodId) query = query.eq("audit_period_id", input.auditPeriodId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAuditPeriodExportItems(input: {
  exportRequestId?: string;
  auditPeriodId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_audit_period_export_item_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.exportRequestId) {
    query = query.eq("audit_period_export_request_id", input.exportRequestId);
  }

  if (input.auditPeriodId) {
    query = query.eq("audit_period_id", input.auditPeriodId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAuditPeriodExportIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_audit_period_export_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requestAuditPeriodExport(input: {
  adminAuthUserId: string;
  auditPeriodId: string;
  exportType?: string;
  exportFormat?: string;
  requestedForAuditorId?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "request_admin_security_audit_period_export",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_audit_period_id: input.auditPeriodId,
      p_export_type: input.exportType ?? "full_period_bundle",
      p_export_format: input.exportFormat ?? "json",
      p_requested_for_auditor_id: input.requestedForAuditorId ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityAuditPeriodExportRequestId: String(data),
    status: "pending"
  };
}

export async function approveAuditPeriodExport(input: {
  adminAuthUserId: string;
  exportRequestId: string;
  approvalNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_security_audit_period_export",
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
    adminSecurityAuditPeriodExportRequestId: String(data),
    status: "approved"
  };
}

export async function registerAuditPeriodExportDownload(input: {
  authUserId: string;
  exportRequestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_admin_security_audit_period_export_download",
    {
      p_auth_user_id: input.authUserId,
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
/*
import { supabaseAdmin } from "../../config/supabase";

export async function listAuditPeriodExports(input: {
  limit?: number;
  status?: string;
  auditPeriodId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_audit_period_export_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.auditPeriodId) query = query.eq("audit_period_id", input.auditPeriodId);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listAuditPeriodExportItems(input: {
  exportRequestId?: string;
  auditPeriodId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_audit_period_export_item_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.exportRequestId) {
    query = query.eq("audit_period_export_request_id", input.exportRequestId);
  }

  if (input.auditPeriodId) {
    query = query.eq("audit_period_id", input.auditPeriodId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getAuditPeriodExportIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_audit_period_export_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requestAuditPeriodExport(input: {
  adminAuthUserId: string;
  auditPeriodId: string;
  exportType?: string;
  exportFormat?: string;
  requestedForAuditorId?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "request_admin_security_audit_period_export",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_audit_period_id: input.auditPeriodId,
      p_export_type: input.exportType ?? "full_period_bundle",
      p_export_format: input.exportFormat ?? "json",
      p_requested_for_auditor_id: input.requestedForAuditorId ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityAuditPeriodExportRequestId: String(data),
    status: "pending"
  };
}

export async function approveAuditPeriodExport(input: {
  adminAuthUserId: string;
  exportRequestId: string;
  approvalNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_security_audit_period_export",
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
    adminSecurityAuditPeriodExportRequestId: String(data),
    status: "approved"
  };
}

export async function registerAuditPeriodExportDownload(input: {
  authUserId: string;
  exportRequestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "register_admin_security_audit_period_export_download",
    {
      p_auth_user_id: input.authUserId,
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
*/
