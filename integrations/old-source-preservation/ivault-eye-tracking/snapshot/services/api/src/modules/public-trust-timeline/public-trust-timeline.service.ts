import { supabaseAdmin } from "../../config/supabase";

export async function listPublicTrustTimeline(input: {
  limit?: number;
  scope?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("list_public_trust_center_timeline", {
    p_limit: input.limit ?? 100,
    p_trust_center_scope: input.scope ?? null,
    p_request_id: input.requestId,
    p_metadata: {
      source: "public-trust-center-timeline"
    }
  });

  if (error) throw error;
  return data;
}

export async function listRoomTrustTimeline(input: {
  authUserId: string;
  roomKey: string;
  limit?: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "list_enterprise_review_room_timeline_for_participant",
    {
      p_auth_user_id: input.authUserId,
      p_room_key: input.roomKey,
      p_limit: input.limit ?? 100,
      p_request_id: input.requestId,
      p_metadata: {
        source: "enterprise-room-trust-timeline"
      }
    }
  );

  if (error) throw error;
  return data;
}
