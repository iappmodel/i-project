import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomPortalSession(input: {
  authUserId: string;
  privateRoomKey: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_private_room_customer_trust_proof_portal_session",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "customer-trust-proof-portal-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function getPortalDashboard(input: {
  authUserId?: string;
  portalToken: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "get_customer_trust_proof_portal_dashboard",
    {
      p_portal_token: input.portalToken,
      p_auth_user_id: input.authUserId ?? null,
      p_request_id: input.requestId
    }
  );

  if (error) throw error;
  return data;
}

export async function listPortalArtifacts(input: {
  authUserId?: string;
  portalToken: string;
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_customer_trust_proof_portal_artifacts",
    {
      p_portal_token: input.portalToken,
      p_auth_user_id: input.authUserId ?? null,
      p_limit: input.limit ?? 50,
      p_request_id: input.requestId
    }
  );

  if (error) throw error;
  return data;
}

export async function listPortalTimeline(input: {
  authUserId?: string;
  portalToken: string;
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_customer_trust_proof_portal_timeline_events",
    {
      p_portal_token: input.portalToken,
      p_auth_user_id: input.authUserId ?? null,
      p_limit: input.limit ?? 50,
      p_request_id: input.requestId
    }
  );

  if (error) throw error;
  return data;
}

export async function getPortalCryptoStatus(input: {
  authUserId?: string;
  portalToken: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "get_customer_trust_proof_portal_crypto_status",
    {
      p_portal_token: input.portalToken,
      p_auth_user_id: input.authUserId ?? null,
      p_request_id: input.requestId
    }
  );

  if (error) throw error;
  return data;
}
