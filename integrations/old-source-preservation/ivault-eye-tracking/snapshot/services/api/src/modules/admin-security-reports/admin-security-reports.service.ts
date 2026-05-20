import { supabaseAdmin } from "../../config/supabase";
export { getComplianceVerificationIntegrity } from "../public-compliance-verification/public-compliance-verification.service";

export async function listSecurityDailySnapshots(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 30, 1), 365);

  let query = supabaseAdmin
    .from("admin_security_daily_snapshot_dashboard")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createSecurityDailySnapshot(input: {
  snapshotDate?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_daily_snapshot",
    {
      p_snapshot_date: input.snapshotDate ?? null,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityDailySnapshotId: String(data)
  };
}

export async function listSecurityReports(input: {
  limit?: number;
  reportType?: string;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_report_export_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.reportType) {
    query = query.eq("report_type", input.reportType);
  }

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSecuritySnapshotIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_snapshot_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function generateSecurityReport(input: {
  adminAuthUserId: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "generate_admin_security_report",
    {
      p_report_type: input.reportType,
      p_period_start: input.periodStart,
      p_period_end: input.periodEnd,
      p_generated_by_auth_user_id: input.adminAuthUserId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityReportExportId: String(data),
    status: "generated"
  };
}

export async function markSecurityReportExported(input: {
  adminAuthUserId: string;
  reportId: string;
  exportFormat: string;
  exportUrl?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "mark_admin_security_report_exported",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_report_id: input.reportId,
      p_export_format: input.exportFormat,
      p_export_url: input.exportUrl ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityReportExportId: String(data),
    status: "exported"
  };
}
