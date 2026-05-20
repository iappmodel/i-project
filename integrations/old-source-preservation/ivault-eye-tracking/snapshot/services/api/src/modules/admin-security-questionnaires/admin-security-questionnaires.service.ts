import { supabaseAdmin } from "../../config/supabase";

export async function listQuestionnaireAiDrafts(input: {
  projectId?: string;
  questionId?: string;
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_questionnaire_ai_draft_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.projectId) query = query.eq("questionnaire_project_id", input.projectId);
  if (input.questionId) query = query.eq("questionnaire_question_id", input.questionId);
  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listQuestionnaireAiMatchCandidates(input: {
  aiDraftRequestId?: string;
  questionId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_questionnaire_ai_match_candidate_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.aiDraftRequestId) {
    query = query.eq("ai_draft_request_id", input.aiDraftRequestId);
  }

  if (input.questionId) {
    query = query.eq("questionnaire_question_id", input.questionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getQuestionnaireAiIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_questionnaire_ai_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requestQuestionnaireAiDraft(input: {
  adminAuthUserId: string;
  questionId: string;
  draftMode?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "request_admin_security_questionnaire_ai_draft",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_questionnaire_question_id: input.questionId,
      p_draft_mode: input.draftMode ?? "match_then_draft",
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    questionnaireAiDraftRequestId: String(data),
    status: "pending"
  };
}

export async function acceptQuestionnaireAiDraft(input: {
  adminAuthUserId: string;
  aiDraftRequestId: string;
  note: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "accept_admin_security_questionnaire_ai_draft",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_ai_draft_request_id: input.aiDraftRequestId,
      p_note: input.note,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    questionnaireQuestionId: String(data),
    status: "needs_review"
  };
}

export async function publishQuestionnaireExportToEnterpriseRoom(input: {
  adminAuthUserId: string;
  questionnaireExportId: string;
  enterpriseReviewRoomId: string;
  displayTitle?: string;
  displaySummary?: string;
  allowDownload?: boolean;
  allowPublicVerification?: boolean;
  accessExpiresAt?: string;
  sortOrder?: number;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "publish_admin_security_questionnaire_export_to_enterprise_room",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_questionnaire_export_id: input.questionnaireExportId,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId,
      p_display_title: input.displayTitle ?? null,
      p_display_summary: input.displaySummary ?? null,
      p_allow_download: input.allowDownload ?? true,
      p_allow_public_verification: input.allowPublicVerification ?? true,
      p_access_expires_at: input.accessExpiresAt ?? null,
      p_sort_order: input.sortOrder ?? 0,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    enterpriseReviewRoomDocumentGrantId: String(data),
    status: "published"
  };
}
