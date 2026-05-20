import { supabaseAdmin } from "../../config/supabase";

export async function listEvidenceAnswerSessions(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_evidence_answer_session_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listEvidenceAnswerRequests(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_evidence_answer_request_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listEvidenceAnswerCitations(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_evidence_answer_citation_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function getEvidenceAnswerIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_evidence_answer_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createEvidenceAnswerSession(input: any) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_evidence_answer_session",
    {
      p_answer_scope: input.answerScope,
      p_requester_auth_user_id: input.requesterAuthUserId ?? null,
      p_requester_email: input.requesterEmail ?? null,
      p_requester_display_name: input.requesterDisplayName ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_private_room_participant_id: input.privateRoomParticipantId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_auditor_participant_id: input.auditorParticipantId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_expires_in_minutes: input.expiresInMinutes ?? 60,
      p_max_questions: input.maxQuestions ?? 100,
      p_allow_uncited_answers: input.allowUncitedAnswers ?? false,
      p_require_exact_citations: input.requireExactCitations ?? true,
      p_allow_partial_answers: input.allowPartialAnswers ?? true,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return data;
}

export async function generateEvidenceAnswer(input: any) {
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
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return data;
}
