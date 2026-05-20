import { supabaseAdmin } from "../../config/supabase";

export async function createPrivateRoomEvidenceAnswerSession(input: {
  authUserId: string;
  privateRoomKey: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_private_room_evidence_answer_session",
    {
      p_auth_user_id: input.authUserId,
      p_private_room_key: input.privateRoomKey,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "evidence-answer-api"
      }
    }
  );

  if (error) throw error;
  return data;
}

export async function generateEvidenceAnswer(input: {
  authUserId?: string;
  answerToken: string;
  questionText: string;
  limit?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "generate_admin_security_evidence_answer",
    {
      p_answer_token: input.answerToken,
      p_question_text: input.questionText,
      p_limit: input.limit ?? 8,
      p_auth_user_id: input.authUserId ?? null,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: {
        source: "evidence-answer-api"
      }
    }
  );

  if (error) throw error;
  return data;
}
