import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomTrustProofReport(input: {
  authUserId: string;
  privateRoomKey: string;
  reportFormat?: string;
  startTime?: string;
  endTime?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_private_room_trust_proof_report",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_report_format: input.reportFormat ?? "html",
      p_start_time: input.startTime ?? null,
      p_end_time: input.endTime ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "trust-proof-report-consumer-api"
      }
    }
  );

  if (error) throw error;

  return {
    trustProofReportId: String(data),
    status: "pending"
  };
}
