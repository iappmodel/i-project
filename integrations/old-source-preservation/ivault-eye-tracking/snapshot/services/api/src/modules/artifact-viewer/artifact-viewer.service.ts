import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomViewerSession(input: {
  authUserId: string;
  privateRoomKey: string;
  artifactKey: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_private_room_artifact_viewer_session",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_artifact_key: input.artifactKey,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "artifact-viewer-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function resolveViewerSession(input: {
  viewerToken: string;
  authUserId?: string;
  pageNumber?: number;
  itemKey?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "resolve_admin_security_artifact_viewer_session",
    {
      p_viewer_token: input.viewerToken,
      p_auth_user_id: input.authUserId ?? null,
      p_page_number: input.pageNumber ?? null,
      p_item_key: input.itemKey ?? null,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "artifact-viewer-api"
      }
    }
  );

  if (error) throw error;
  return data;
}
