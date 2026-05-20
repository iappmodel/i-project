import { createUserSupabaseClient, supabaseAdmin } from "../../config/supabase";
import { decodeCursor, encodeCursor } from "../../shared/cursor";
import { mapAttentionHistoryRow } from "./attention.mapper";

export async function startAttentionSession(input: {
  userId: string;
  walletId: string;
  campaignId?: string;
  creativeId?: string;
  placementId?: string;
  deviceId?: string;
  appSessionId?: string;
  appVersion?: string;
  platform?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("start_attention_verification_session", {
    p_user_id: input.userId,
    p_wallet_id: input.walletId,
    p_campaign_id: input.campaignId ?? null,
    p_creative_id: input.creativeId ?? null,
    p_placement_id: input.placementId ?? null,
    p_device_id: input.deviceId ?? null,
    p_app_session_id: input.appSessionId ?? null,
    p_app_version: input.appVersion ?? null,
    p_platform: input.platform ?? null,
    p_model_version: "vision_model_v1",
    p_pipeline_version: "runtime_pipeline_v1",
    p_runtime_signal_schema_version: "runtime_signals_v1",
    p_scoring_formula_version: "attention_score_v1",
    p_metadata: input.metadata ?? {}
  });

  if (error) {
    throw error;
  }

  return {
    attentionSessionId: String(data)
  };
}

export async function completeAttentionSession(input: {
  attentionSessionId: string;
  decision: string;
  decisionReason: string;
  attentionScore: number;
  confidenceScore: number;
  fraudRiskScore: number;
  qualityScore: number;
  gazeScore?: number;
  fixationScore?: number;
  livenessScore?: number;
  completionScore?: number;
  validFrameCount: number;
  invalidFrameCount: number;
  noFaceFrameCount: number;
  gazeInvalidFrameCount: number;
  rewardEligible?: boolean;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("complete_attention_verification_event", {
    p_attention_session_id: input.attentionSessionId,
    p_decision: input.decision,
    p_decision_reason: input.decisionReason,
    p_attention_score: input.attentionScore,
    p_confidence_score: input.confidenceScore,
    p_fraud_risk_score: input.fraudRiskScore,
    p_quality_score: input.qualityScore,
    p_gaze_score: input.gazeScore ?? null,
    p_fixation_score: input.fixationScore ?? null,
    p_liveness_score: input.livenessScore ?? null,
    p_completion_score: input.completionScore ?? null,
    p_valid_frame_count: input.validFrameCount,
    p_invalid_frame_count: input.invalidFrameCount,
    p_no_face_frame_count: input.noFaceFrameCount,
    p_gaze_invalid_frame_count: input.gazeInvalidFrameCount,
    p_reward_eligible: input.rewardEligible ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: input.metadata ?? {}
  });

  if (error) {
    throw error;
  }

  return {
    attentionEventId: String(data),
    rewardStatus: "queued" as const
  };
}

export async function getAttentionHistory(
  accessToken: string,
  userId: string,
  limit = 50,
  cursor?: string
) {
  const db = createUserSupabaseClient(accessToken);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const fetchLimit = safeLimit + 1;

  let query = db
    .from("app_attention_history")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .order("attention_event_id", { ascending: false })
    .limit(fetchLimit);

  if (cursor) {
    const decoded = decodeCursor(cursor);

    query = query.or(
      [
        `occurred_at.lt.${decoded.timestamp}`,
        `and(occurred_at.eq.${decoded.timestamp},attention_event_id.lt.${decoded.id})`
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, safeLimit);
  const hasNextPage = rows.length > safeLimit;
  const last = pageRows[pageRows.length - 1];

  return {
    items: pageRows.map(mapAttentionHistoryRow),
    nextCursor:
      hasNextPage && last
        ? encodeCursor({
            timestamp: String(last.occurred_at),
            id: String(last.attention_event_id)
          })
        : null
  };
}
