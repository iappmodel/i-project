import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomTimelineSnapshot(input: {
  authUserId: string;
  privateRoomKey: string;
  startTime?: string;
  endTime?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_private_room_trust_timeline_snapshot",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_start_time: input.startTime ?? null,
      p_end_time: input.endTime ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "trust-timeline-api"
      }
    }
  );

  if (error) throw error;

  return {
    timelineSnapshotId: String(data),
    status: "pending"
  };
}
