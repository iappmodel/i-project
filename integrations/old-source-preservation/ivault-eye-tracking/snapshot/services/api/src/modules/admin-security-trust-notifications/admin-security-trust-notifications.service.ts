import { supabaseAdmin } from "../../config/supabase";

export async function listTrustNotificationSubscribers(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_notification_subscriber_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustNotificationEvents(input: {
  limit?: number;
  status?: string;
  topicType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_notification_event_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.topicType) query = query.eq("topic_type", input.topicType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustNotificationDeliveries(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_notification_delivery_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrustNotificationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_notification_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTrustSubscriber(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_trust_notification_subscriber",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_subscriber_type: input.subscriberType,
      p_email: input.email,
      p_display_name: input.displayName ?? null,
      p_auth_user_id: input.authUserId ?? null,
      p_organization_name: input.organizationName ?? null,
      p_organization_domain: input.organizationDomain ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_participant_id: input.participantId ?? null,
      p_preferred_channel: input.preferredChannel ?? "email",
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    trustNotificationSubscriberId: String(data),
    status: "active"
  };
}

export async function createTrustNotificationEvent(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_trust_notification_event",
    {
      p_topic_key: input.topicKey,
      p_event_type: input.eventType,
      p_event_severity: input.eventSeverity ?? "info",
      p_visibility: input.visibility ?? "customer_scoped",
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_title: input.title,
      p_summary: input.summary,
      p_body_markdown: input.bodyMarkdown ?? null,
      p_source_artifact_key: input.sourceArtifactKey ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_action_url: input.actionUrl ?? null,
      p_public_safe: input.publicSafe ?? true,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    trustNotificationEventId: data ? String(data) : null,
    status: data ? "queued" : "suppressed"
  };
}

export async function fanoutTrustNotificationEvent(input: {
  notificationEventId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "fanout_admin_security_trust_notification_event",
    {
      p_notification_event_id: input.notificationEventId,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return { recipientCount: Number(data ?? 0) };
}

export async function runTrustNotificationFanout(input: {
  batchSize?: number;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "process_admin_security_trust_notification_fanout_queue",
    {
      p_batch_size: input.batchSize ?? 100,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { runId: String(data) };
}

export async function runExpiryWarnings(input: {
  daysBefore?: number;
  batchSize?: number;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "queue_admin_security_trust_expiry_warning_notifications",
    {
      p_days_before: input.daysBefore ?? 14,
      p_batch_size: input.batchSize ?? 500,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { runId: String(data) };
}

export async function syncRoomSubscribers(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "sync_enterprise_room_trust_notification_subscribers",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { subscriberCount: Number(data ?? 0) };
}

export async function syncAuditorSubscribers(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "sync_auditor_portal_trust_notification_subscribers",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_auditor_portal_id: input.auditorPortalId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return { subscriberCount: Number(data ?? 0) };
}
