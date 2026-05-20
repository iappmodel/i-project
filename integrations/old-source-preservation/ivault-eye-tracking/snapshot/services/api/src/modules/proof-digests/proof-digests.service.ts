import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomDigestSubscription(input: {
  authUserId: string;
  privateRoomKey: string;
  recipientEmail: string;
  recipientDisplayName?: string;
  digestFrequency?: string;
  digestChannel?: string;
  timezone?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "upsert_private_room_proof_digest_subscription",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_recipient_email: input.recipientEmail,
      p_recipient_display_name: input.recipientDisplayName ?? null,
      p_digest_frequency: input.digestFrequency ?? "daily",
      p_digest_channel: input.digestChannel ?? "email",
      p_timezone: input.timezone ?? "UTC",
      p_request_id: input.requestId,
      p_metadata: {
        source: "proof-digests-consumer-api"
      }
    }
  );

  if (error) throw error;

  return {
    proofDigestSubscriptionId: String(data),
    status: "active"
  };
}
