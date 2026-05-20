import { supabaseAdmin } from "../../config/supabase";

export async function getAdminSecurityCommandCenterSummary() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_command_center_summary")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function listAdminSecurityPriorityQueue(input: {
  limit?: number;
  itemType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_priority_queue")
    .select("*")
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (input.itemType) {
    query = query.eq("item_type", input.itemType);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function listAdminSecurityTimeline(input: {
  limit?: number;
  eventType?: string;
  targetAuthUserId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_timeline")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.eventType) {
    query = query.eq("event_type", input.eventType);
  }

  if (input.targetAuthUserId) {
    query = query.eq("target_auth_user_id", input.targetAuthUserId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function listAdminSecurityActorRollup(input: {
  limit?: number;
  postureStatus?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin.from("admin_security_actor_rollup").select("*").limit(safeLimit);

  if (input.postureStatus) {
    query = query.eq("posture_status", input.postureStatus);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function listAdminSecurityPostureChecks() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_posture_checks")
    .select("*");

  if (error) throw error;

  return data ?? [];
}
