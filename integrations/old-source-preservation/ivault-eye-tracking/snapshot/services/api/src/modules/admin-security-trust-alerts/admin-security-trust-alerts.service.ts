import { supabaseAdmin } from "../../config/supabase";

export type TrustAlertListInput = {
  limit?: number;
  status?: string;
  severity?: string;
  alertPriority?: string;
  sourceModule?: string;
  customerName?: string;
  channelType?: string;
};

export async function listAlertEvents(input: TrustAlertListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_alert_event_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.severity) query = query.eq("severity", input.severity);
  if (input.alertPriority) query = query.eq("alert_priority", input.alertPriority);
  if (input.sourceModule) query = query.eq("source_module", input.sourceModule);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAlertNotifications(input: TrustAlertListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_alert_notification_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.channelType) query = query.eq("channel_type", input.channelType);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAlertPolicies(input: TrustAlertListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_alert_policy_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.sourceModule) query = query.eq("source_module", input.sourceModule);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAlertIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_alert_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type CreateAlertEventInput = {
  sourceModule: string;
  sourceEventType: string;
  severity?: string;
  alertPriority?: string;
  title: string;
  summary: string;
  customerName?: string;
  customerDomain?: string;
  sourceTable?: string;
  sourceId?: string;
  sourceKey?: string;
  dedupeKey?: string;
  alertPayload?: Record<string, unknown>;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function createAlertEvent(input: CreateAlertEventInput) {
  const { data, error } = await supabaseAdmin.rpc("create_admin_security_trust_alert_event", {
    p_source_module: input.sourceModule,
    p_source_event_type: input.sourceEventType,
    p_severity: input.severity,
    p_alert_priority: input.alertPriority,
    p_title: input.title,
    p_summary: input.summary,
    p_customer_name: input.customerName ?? null,
    p_customer_domain: input.customerDomain ?? null,
    p_source_table: input.sourceTable ?? null,
    p_source_id: input.sourceId ?? null,
    p_source_key: input.sourceKey ?? null,
    p_command_queue_item_id: null,
    p_incident_id: null,
    p_ai_finding_id: null,
    p_risk_score_id: null,
    p_webhook_delivery_id: null,
    p_billing_account_id: null,
    p_dedupe_key: input.dedupeKey ?? null,
    p_alert_payload: input.alertPayload ?? {},
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    alertEventId: String(data)
  };
}

export async function syncAlertEvents(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("sync_admin_security_trust_alert_events", {
    p_batch_size: 500,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

export async function buildAlertNotifications(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("build_admin_security_trust_alert_notifications", {
    p_batch_size: 500,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

export type RecordAlertNotificationResultInput = {
  alertNotificationId: string;
  success: boolean;
  responseStatus?: number;
  responseBodyPreview?: string;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function recordAlertNotificationResult(input: RecordAlertNotificationResultInput) {
  const { data, error } = await supabaseAdmin.rpc("record_admin_security_trust_alert_notification_result", {
    p_alert_notification_id: input.alertNotificationId,
    p_success: input.success,
    p_response_status: input.responseStatus ?? null,
    p_response_body_preview: input.responseBodyPreview ?? null,
    p_error_code: input.errorCode ?? null,
    p_error_message: input.errorMessage ?? null,
    p_duration_ms: input.durationMs ?? null,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    deliveryAttemptId: String(data)
  };
}

export type AcknowledgeAlertEventInput = {
  adminAuthUserId: string;
  alertEventId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function acknowledgeAlertEvent(input: AcknowledgeAlertEventInput) {
  const { data, error } = await supabaseAdmin.rpc("acknowledge_admin_security_trust_alert_event", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_alert_event_id: input.alertEventId,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    alertEventId: String(data),
    status: "acknowledged"
  };
}

export type ResolveAlertEventInput = {
  adminAuthUserId: string;
  alertEventId: string;
  resolutionNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function resolveAlertEvent(input: ResolveAlertEventInput) {
  const { data, error } = await supabaseAdmin.rpc("resolve_admin_security_trust_alert_event", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_alert_event_id: input.alertEventId,
    p_resolution_note: input.resolutionNote,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    alertEventId: String(data),
    status: "resolved"
  };
}
