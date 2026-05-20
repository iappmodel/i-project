import { supabaseAdmin } from "../../config/supabase";

export async function listTimelineSubjects(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_subject_dashboard")
    .select("*")
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listTimelineEvents(input: {
  limit?: number;
  eventFamily?: string;
  eventType?: string;
  riskLevel?: string;
  privateRoomId?: string;
  customerName?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_timeline_event_dashboard")
    .select("*")
    .order("event_time", { ascending: false })
    .limit(safeLimit);

  if (input.eventFamily) query = query.eq("event_family", input.eventFamily);
  if (input.eventType) query = query.eq("event_type", input.eventType);
  if (input.riskLevel) query = query.eq("risk_level", input.riskLevel);
  if (input.privateRoomId) query = query.eq("private_room_id", input.privateRoomId);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTimelineSnapshots(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_snapshot_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function getTimelineIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTimelineSnapshot(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_trust_timeline_snapshot",
    {
      p_snapshot_scope: input.snapshotScope,
      p_title: input.title,
      p_summary: input.summary ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_start_time: input.startTime ?? null,
      p_end_time: input.endTime ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    timelineSnapshotId: String(data),
    status: "pending"
  };
}

export async function buildTimelineSnapshot(input: {
  snapshotId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "build_admin_security_trust_timeline_snapshot",
    {
      p_snapshot_id: input.snapshotId,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    timelineSnapshotId: String(data),
    status: "ready"
  };
}
