import { supabaseAdmin } from "../../config/supabase";

export async function listNotificationChannels(input: {
  status?: string;
  channelType?: string;
}) {
  let query = supabaseAdmin
    .from("admin_security_notification_channel_dashboard")
    .select("*")
    .order("channel_type", { ascending: true });

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.channelType) {
    query = query.eq("channel_type", input.channelType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateNotificationChannel(input: {
  channelId: string;
  status?: string;
  displayName?: string;
  destination?: string;
  secretRef?: string;
  minSeverity?: string;
  metadata?: Record<string, unknown>;
}) {
  const patch: Record<string, unknown> = {};

  if (input.status !== undefined) patch.status = input.status;
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.destination !== undefined) patch.destination = input.destination;
  if (input.secretRef !== undefined) patch.secret_ref = input.secretRef;
  if (input.minSeverity !== undefined) patch.min_severity = input.minSeverity;
  if (input.metadata !== undefined) patch.metadata = input.metadata;

  const { data, error } = await supabaseAdmin
    .from("admin_security_notification_channels")
    .update(patch)
    .eq("id", input.channelId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listNotificationDeliveries(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_notification_delivery_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getNotificationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_notification_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}
