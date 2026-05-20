import { supabaseAdmin } from "../../config/supabase";

export async function listCustomerTrustProofPortals(input: {
  limit?: number;
  status?: string;
  customerName?: string;
  privateRoomId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_customer_trust_proof_portal_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.privateRoomId) query = query.eq("private_room_id", input.privateRoomId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listCustomerTrustProofPortalSessions(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_customer_trust_proof_portal_session_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listCustomerTrustProofPortalEvents(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_customer_trust_proof_portal_event_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function getCustomerTrustProofPortalIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_customer_trust_proof_portal_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOrCreatePrivateRoomPortal(input: {
  privateRoomId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "get_or_create_private_room_customer_trust_proof_portal",
    {
      p_private_room_id: input.privateRoomId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    portalId: String(data)
  };
}
