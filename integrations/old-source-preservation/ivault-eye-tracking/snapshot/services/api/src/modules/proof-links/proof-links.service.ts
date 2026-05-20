import { supabaseAdmin } from "../../config/supabase";

export async function resolveProofVerificationLink(input: {
  code: string;
  token: string;
  requesterIp?: string;
  userAgent?: string;
  referrer?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "resolve_public_proof_verification_link",
    {
      p_short_code: input.code,
      p_token: input.token,
      p_requester_ip: input.requesterIp ?? null,
      p_user_agent: input.userAgent ?? null,
      p_referrer: input.referrer ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "proof-link-resolver-api"
      }
    }
  );

  if (error) throw error;
  return data;
}
