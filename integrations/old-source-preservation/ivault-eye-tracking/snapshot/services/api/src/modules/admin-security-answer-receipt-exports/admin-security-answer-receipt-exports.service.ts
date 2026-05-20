import { supabaseAdmin } from "../../config/supabase";

export async function listAnswerReceiptExportBundles(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_answer_receipt_export_bundle_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAnswerReceiptExportBundleItems(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_export_bundle_item_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listAnswerReceiptExportBundleFiles(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_export_bundle_file_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listAnswerReceiptExportBundleJobs(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_answer_receipt_export_bundle_job_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAnswerReceiptExportBundleIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_answer_receipt_export_bundle_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAnswerReceiptExportBundle(input: {
  answerReceiptId: string;
  bundleType?: string;
  exportFormat?: string;
  includePdfSummary?: boolean;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_answer_receipt_export_bundle",
    {
      p_answer_receipt_id: input.answerReceiptId,
      p_bundle_type: input.bundleType ?? "receipt_export",
      p_export_format: input.exportFormat ?? "json",
      p_include_pdf_summary: input.includePdfSummary ?? false,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    answerReceiptExportBundleId: String(data),
    status: "pending"
  };
}

export async function revokeAnswerReceiptExportBundle(input: {
  adminAuthUserId: string;
  exportBundleId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_answer_receipt_export_bundle",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_export_bundle_id: input.exportBundleId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    answerReceiptExportBundleId: String(data),
    status: "revoked"
  };
}
