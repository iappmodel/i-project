import { supabaseAdmin } from "../../config/supabase";

export async function listProofDigestSubscriptions(input: {
  limit?: number;
  status?: string;
  recipientEmail?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_digest_subscription_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.recipientEmail) query = query.eq("recipient_email", input.recipientEmail);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofNotificationEvents(input: {
  limit?: number;
  status?: string;
  eventType?: string;
  severity?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_notification_event_dashboard")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.eventType) query = query.eq("event_type", input.eventType);
  if (input.severity) query = query.eq("severity", input.severity);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofDigestRuns(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_digest_run_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofDigestItems(input: {
  limit?: number;
  severity?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_digest_item_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.severity) query = query.eq("severity", input.severity);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProofDigestIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_proof_digest_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAdminDigestSubscription(input: {
  adminAuthUserId: string;
  recipientEmail: string;
  recipientDisplayName?: string;
  digestFrequency?: string;
  digestChannel?: string;
  timezone?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "upsert_admin_proof_digest_subscription",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_recipient_email: input.recipientEmail,
      p_recipient_display_name: input.recipientDisplayName ?? null,
      p_digest_frequency: input.digestFrequency ?? "daily",
      p_digest_channel: input.digestChannel ?? "email",
      p_timezone: input.timezone ?? "UTC",
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    proofDigestSubscriptionId: String(data),
    status: "active"
  };
}

export async function recordProofNotificationEvent(input: {
  eventScope: string;
  eventType: string;
  severity?: string;
  title: string;
  summary?: string;
  customerName?: string;
  customerDomain?: string;
  privateRoomId?: string;
  sourceType?: string;
  sourceId?: string;
  sourceKey?: string;
  proofType?: string;
  proofKey?: string;
  proofHashSha256?: string;
  relatedUrl?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "record_admin_security_proof_notification_event",
    {
      p_event_scope: input.eventScope,
      p_event_type: input.eventType,
      p_severity: input.severity ?? "info",
      p_title: input.title,
      p_summary: input.summary ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_private_room_participant_id: null,
      p_auditor_portal_id: null,
      p_enterprise_review_room_id: null,
      p_source_type: input.sourceType ?? "system",
      p_source_id: input.sourceId ?? null,
      p_source_key: input.sourceKey ?? null,
      p_proof_type: input.proofType ?? null,
      p_proof_key: input.proofKey ?? null,
      p_proof_hash_sha256: input.proofHashSha256 ?? null,
      p_related_url: input.relatedUrl ?? null,
      p_occurred_at: new Date().toISOString(),
      p_dedupe_key: null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    proofNotificationEventId: String(data)
  };
}

export async function processProofDigests(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc(
    "process_due_admin_security_proof_digests",
    {
      p_batch_size: 100,
      p_worker_id: "admin-api",
      p_request_id: input.requestId,
      p_metadata: {
        source: "admin-api"
      }
    }
  );

  if (error) throw error;
  return data;
}
