import { supabaseAdmin } from "../../config/supabase";
import type { RefreshCommandCenterBody, TrustCommandCenterQuery } from "./admin-security-trust-command-center.validation";

export async function getLatestCommandSnapshot(input: TrustCommandCenterQuery) {
  let query = supabaseAdmin.from("admin_security_trust_command_center_latest_snapshot").select("*");

  if (input.customerName) {
    query = query.eq("customer_name", input.customerName);
    if (input.customerDomain !== undefined && input.customerDomain !== "") {
      query = query.eq("customer_domain", input.customerDomain);
    }
  } else {
    query = query.eq("snapshot_scope", "global");
  }

  const { data, error } = await query.order("computed_at", { ascending: false }).limit(1).maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function listCommandCards(input: TrustCommandCenterQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_command_center_card_dashboard")
    .select("*")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .limit(safeLimit);

  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.customerDomain !== undefined && input.customerDomain !== "") {
    query = query.eq("customer_domain", input.customerDomain);
  }
  if (input.cardGroup) query = query.eq("card_group", input.cardGroup);
  if (input.severity) query = query.eq("severity", input.severity);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listCommandQueue(input: TrustCommandCenterQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_command_center_queue_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.customerDomain !== undefined && input.customerDomain !== "") {
    query = query.eq("customer_domain", input.customerDomain);
  }
  if (input.queueType) query = query.eq("queue_type", input.queueType);
  if (input.severity) query = query.eq("severity", input.severity);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listCommandTimeline(input: TrustCommandCenterQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_command_center_timeline_dashboard")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(safeLimit);

  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.customerDomain !== undefined && input.customerDomain !== "") {
    query = query.eq("customer_domain", input.customerDomain);
  }
  if (input.severity) query = query.eq("severity", input.severity);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCommandCenterIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_command_center_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function refreshCommandCenter(input: RefreshCommandCenterBody & { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("refresh_admin_security_trust_command_center", {
    p_customer_name: input.customerName ?? null,
    p_customer_domain: input.customerDomain ?? null,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;
  return data;
}

export async function processCustomerCommandCenters(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("process_admin_security_trust_command_center_customers", {
    p_batch_size: 500,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

export async function acknowledgeCommandQueueItem(input: {
  queueItemId: string;
  adminAuthUserId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("acknowledge_admin_security_trust_command_queue_item", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_queue_item_id: input.queueItemId,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    queueItemId: String(data),
    status: "acknowledged"
  };
}

export async function resolveCommandQueueItem(input: {
  queueItemId: string;
  adminAuthUserId: string;
  resolutionNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("resolve_admin_security_trust_command_queue_item", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_queue_item_id: input.queueItemId,
    p_resolution_note: input.resolutionNote,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    queueItemId: String(data),
    status: "resolved"
  };
}
