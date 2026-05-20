import { supabaseAdmin } from "../../config/supabase";
import type { CreateProofHealthSignalInput } from "./admin-security-proof-observability.validation";

export async function getProofCommandCenterLatest() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_proof_command_center_latest")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProofCommandCenterQueues() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_proof_command_center_queues")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCustomerTrustHealth(input: {
  limit?: number;
  healthStatus?: string;
  riskLevel?: string;
  customerName?: string;
  privateRoomId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_customer_trust_health_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.healthStatus) query = query.eq("health_status", input.healthStatus);
  if (input.riskLevel) query = query.eq("risk_level", input.riskLevel);
  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.privateRoomId) query = query.eq("private_room_id", input.privateRoomId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofHealthSignals(input: {
  limit?: number;
  severity?: string;
  signalType?: string;
  privateRoomId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_health_signal_dashboard")
    .select("*")
    .order("observed_at", { ascending: false })
    .limit(safeLimit);

  if (input.severity) query = query.eq("severity", input.severity);
  if (input.signalType) query = query.eq("signal_type", input.signalType);
  if (input.privateRoomId) query = query.eq("private_room_id", input.privateRoomId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofCommandCenterRecentActivity(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_proof_command_center_recent_activity")
    .select("*")
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function getProofObservabilityIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_proof_observability_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function runProofObservabilityCycle(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("process_admin_security_proof_observability_cycle", {
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: {
      source: "admin-api"
    }
  });

  if (error) throw error;
  return data;
}

export async function createProofHealthSignal(
  input: CreateProofHealthSignalInput & { requestId: string }
) {
  const { data, error } = await supabaseAdmin.rpc("record_admin_security_proof_health_signal", {
    p_signal_scope: input.signalScope ?? "global_admin",
    p_signal_type: input.signalType,
    p_severity: input.severity ?? "info",
    p_title: input.title,
    p_summary: input.summary ?? null,
    p_customer_name: input.customerName ?? null,
    p_customer_domain: input.customerDomain ?? null,
    p_private_room_id: input.privateRoomId ?? null,
    p_auditor_portal_id: null,
    p_enterprise_review_room_id: null,
    p_source_type: input.sourceType ?? "manual",
    p_source_id: input.sourceId ?? null,
    p_source_key: input.sourceKey ?? null,
    p_metric_name: input.metricName ?? null,
    p_metric_value: input.metricValue ?? null,
    p_proof_type: input.proofType ?? null,
    p_proof_key: input.proofKey ?? null,
    p_observed_at: new Date().toISOString(),
    p_dedupe_key: null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    proofHealthSignalId: String(data)
  };
}
