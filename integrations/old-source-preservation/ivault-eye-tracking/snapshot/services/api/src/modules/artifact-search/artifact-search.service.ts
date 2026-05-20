import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomSearchSession(input: {
  authUserId: string;
  privateRoomKey: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_private_room_artifact_search_session",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "artifact-search-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function executeArtifactSearch(input: {
  authUserId?: string;
  searchToken: string;
  queryText: string;
  queryType?: string;
  limit?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "execute_admin_security_artifact_search",
    {
      p_search_token: input.searchToken,
      p_query_text: input.queryText,
      p_query_type: input.queryType ?? "keyword",
      p_limit: input.limit ?? 20,
      p_auth_user_id: input.authUserId ?? null,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "artifact-search-api"
      }
    }
  );

  if (error) throw error;
  return data;
}
