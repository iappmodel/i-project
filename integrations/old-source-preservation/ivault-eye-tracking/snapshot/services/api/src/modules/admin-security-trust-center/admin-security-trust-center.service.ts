import { supabaseAdmin } from "../../config/supabase";

export async function listTrustCenterProfiles(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_center_profile_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustCenterManifests(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_center_manifest_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrustCenterIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_center_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function queueTrustCenterManifest(input: {
  adminAuthUserId: string;
  trustCenterKey: string;
  visibility: "public" | "customer_only" | "auditor_only" | "admin_only";
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "queue_admin_security_trust_center_manifest_generation",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_trust_center_key: input.trustCenterKey ?? "default",
      p_visibility: input.visibility ?? "public",
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    trustCenterManifestId: String(data),
    status: "pending"
  };
}
