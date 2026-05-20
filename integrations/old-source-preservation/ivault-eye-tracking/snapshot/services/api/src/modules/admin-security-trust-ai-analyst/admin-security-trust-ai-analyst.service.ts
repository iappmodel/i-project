import { supabaseAdmin } from "../../config/supabase";

export type TrustAiAnalystQuery = {
  limit?: number;
  status?: string;
  severity?: string;
  detectorFamily?: string;
  customerName?: string;
};

export type RunTrustAiAnalystBody = {
  detectorFamily?: string;
  customerName?: string;
  customerDomain?: string;
  metadata?: Record<string, unknown>;
};

export async function listTrustAiDetectors(input: TrustAiAnalystQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_ai_detector_dashboard")
    .select("*")
    .order("detector_family", { ascending: true })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.detectorFamily) query = query.eq("detector_family", input.detectorFamily);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustAiFindings(input: TrustAiAnalystQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_ai_finding_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.severity) query = query.eq("severity", input.severity);
  if (input.detectorFamily) query = query.eq("detector_family", input.detectorFamily);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listCustomerRiskScores(input: TrustAiAnalystQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_customer_trust_risk_score_dashboard")
    .select("*")
    .order("computed_at", { ascending: false })
    .limit(safeLimit);

  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustAiRecommendedActions(input: TrustAiAnalystQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_ai_recommended_action_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrustAiIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_ai_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

type RunTrustAiAnalystInput = RunTrustAiAnalystBody & { requestId: string };

export async function runTrustAiAnalyst(input: RunTrustAiAnalystInput) {
  const { data, error } = await supabaseAdmin.rpc("run_admin_security_trust_ai_analyst", {
    p_run_type: "manual",
    p_detector_family: input.detectorFamily ?? null,
    p_customer_name: input.customerName ?? null,
    p_customer_domain: input.customerDomain ?? null,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    analystRunId: String(data)
  };
}

export async function computeCustomerRiskScores(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("compute_admin_security_customer_trust_risk_scores", {
    p_period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    p_period_end: new Date().toISOString(),
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

type FindingMutationInput = {
  findingId: string;
  adminAuthUserId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

type ResolveFindingInput = FindingMutationInput & {
  resolutionNote: string;
  metadata?: Record<string, unknown>;
};

type SuppressFindingInput = FindingMutationInput & {
  suppressionReason: string;
  metadata?: Record<string, unknown>;
};

export async function acknowledgeFinding(input: FindingMutationInput) {
  const { data, error } = await supabaseAdmin.rpc("acknowledge_admin_security_trust_ai_finding", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_finding_id: input.findingId,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    findingId: String(data),
    status: "acknowledged"
  };
}

export async function resolveFinding(input: ResolveFindingInput) {
  const { data, error } = await supabaseAdmin.rpc("resolve_admin_security_trust_ai_finding", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_finding_id: input.findingId,
    p_resolution_note: input.resolutionNote,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    findingId: String(data),
    status: "resolved"
  };
}

export async function suppressFinding(input: SuppressFindingInput) {
  const { data, error } = await supabaseAdmin.rpc("suppress_admin_security_trust_ai_finding", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_finding_id: input.findingId,
    p_suppression_reason: input.suppressionReason,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    findingId: String(data),
    status: "suppressed"
  };
}
