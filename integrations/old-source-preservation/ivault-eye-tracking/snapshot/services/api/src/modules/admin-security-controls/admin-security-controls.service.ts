import { supabaseAdmin } from "../../config/supabase";

export async function listControlCoverage(input: {
  limit?: number;
  frameworkKey?: string;
  coverageStatus?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_control_coverage_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.frameworkKey) query = query.eq("framework_key", input.frameworkKey);
  if (input.coverageStatus) query = query.eq("coverage_status", input.coverageStatus);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listPolicyControlMappings() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_policy_control_mapping_dashboard")
    .select("*")
    .order("framework_key", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function collectControlEvidence(input: {
  adminAuthUserId: string;
  frameworkKey?: string;
  controlKey?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "run_admin_security_control_evidence_collection",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_framework_key: input.frameworkKey ?? null,
      p_control_key: input.controlKey ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityControlEvidenceRunId: String(data)
  };
}

export async function listEvidenceRuns(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_control_evidence_run_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getControlMappingIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_control_mapping_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}
