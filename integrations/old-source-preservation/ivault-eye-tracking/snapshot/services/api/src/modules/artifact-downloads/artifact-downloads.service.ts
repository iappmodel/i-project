import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomDownloadGrant(input: {
  authUserId: string;
  privateRoomKey: string;
  artifactKey: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_private_room_artifact_download_grant",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_artifact_key: input.artifactKey,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "artifact-download-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function resolveDownloadGrant(input: {
  downloadToken: string;
  authUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "resolve_admin_security_artifact_download_grant",
    {
      p_download_token: input.downloadToken,
      p_auth_user_id: input.authUserId ?? null,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "artifact-download-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function completeDownload(input: {
  downloadGrantId: string;
  attemptId: string;
  bytesServed?: number;
  checksumSha256?: string;
  signedUrlUsed?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "complete_admin_security_artifact_download",
    {
      p_download_grant_id: input.downloadGrantId,
      p_attempt_id: input.attemptId,
      p_bytes_served: input.bytesServed ?? null,
      p_checksum_sha256: input.checksumSha256 ?? null,
      p_signed_url_used: input.signedUrlUsed ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "artifact-download-api"
      }
    }
  );

  if (error) throw error;

  return {
    downloadCompletionId: String(data),
    status: "completed"
  };
}
