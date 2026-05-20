import { supabaseAdmin } from "../../../config/supabase";
import type { PopsProofLevel, PopsSessionState, PopsSessionType } from "../../../pops/types/pops.types";
import type {
  PopsSessionRepository as PopsSessionRepositoryContract,
  PopsSessionRow
} from "./pops-repository.types";

export type PopsSessionRecord = PopsSessionRow & {
  session_type: PopsSessionType;
  proof_level: PopsProofLevel;
  state: PopsSessionState;
  required_duration_ms: number;
  minimum_presence_confidence: number;
  minimum_attention_confidence: number;
  minimum_intent_confidence: number;
  maximum_fraud_risk: number;
};

export function coerceDeviceUuid(deviceId: string): string {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(deviceId) ? deviceId : crypto.randomUUID();
}

export class PopsSessionRepository implements PopsSessionRepositoryContract {
  async getSessionById(sessionId: string): Promise<PopsSessionRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("pops_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw error;
    return (data as PopsSessionRecord | null) ?? null;
  }

  async updateSessionState(
    sessionId: string,
    state: string,
    patch: Record<string, unknown> = {}
  ): Promise<PopsSessionRecord> {
    const { data, error } = await supabaseAdmin
      .from("pops_sessions")
      .update({
        ...patch,
        state,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .select("*")
      .single();
    if (error) throw error;
    return data as PopsSessionRecord;
  }

  async closeSession(sessionId: string, patch: Record<string, unknown> = {}): Promise<PopsSessionRecord> {
    return this.updateSessionState(sessionId, "CLOSED", {
      ...patch,
      ended_at: patch.ended_at ?? new Date().toISOString()
    });
  }

  /** One reward decision pipeline per session (retry after DENIED would need explicit product support). */
  async countRewardDecisionsForSession(sessionId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("pops_reward_decisions")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (error) throw error;
    return count ?? 0;
  }

  async patchRewardDecision(decisionId: string, patch: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from("pops_reward_decisions")
      .update(patch)
      .eq("id", decisionId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async createSession(input: {
    userId: string;
    deviceId: string;
    contentId?: string | null;
    campaignId?: string | null;
    sessionType: PopsSessionType;
    proofLevel: PopsProofLevel;
    state: PopsSessionState;
    startedAt: string;
    requiredDurationMs: number;
    minimumPresenceConfidence: number;
    minimumAttentionConfidence: number;
    minimumIntentConfidence: number;
    minimumContinuityConfidence?: number | null;
    maximumFraudRisk: number;
    privacyPolicy: string;
    rawStoragePolicy: string;
    metadata: Record<string, unknown>;
  }): Promise<PopsSessionRecord> {
    const { data, error } = await supabaseAdmin
      .from("pops_sessions")
      .insert({
        user_id: input.userId,
        device_id: coerceDeviceUuid(input.deviceId),
        content_id: input.contentId ?? null,
        campaign_id: input.campaignId ?? null,
        session_type: input.sessionType,
        proof_level: input.proofLevel,
        state: input.state,
        started_at: input.startedAt,
        required_duration_ms: input.requiredDurationMs,
        minimum_presence_confidence: input.minimumPresenceConfidence,
        minimum_attention_confidence: input.minimumAttentionConfidence,
        minimum_intent_confidence: input.minimumIntentConfidence,
        minimum_continuity_confidence: input.minimumContinuityConfidence ?? null,
        maximum_fraud_risk: input.maximumFraudRisk,
        privacy_policy: input.privacyPolicy,
        raw_storage_policy: input.rawStoragePolicy,
        metadata: input.metadata,
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as PopsSessionRecord;
  }

  async getSessionForUser(sessionId: string, userId: string): Promise<PopsSessionRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("pops_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as PopsSessionRecord | null) ?? null;
  }

  async updateSession(sessionId: string, patch: Record<string, unknown>): Promise<PopsSessionRecord> {
    const { data, error } = await supabaseAdmin
      .from("pops_sessions")
      .update({
        ...patch,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error) throw error;
    return data as PopsSessionRecord;
  }

  async getLatestPrivacyReceiptForSession(sessionId: string) {
    const { data, error } = await supabaseAdmin
      .from("pops_privacy_receipts")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async getRewardDecisionById(decisionId: string) {
    const { data, error } = await supabaseAdmin
      .from("pops_reward_decisions")
      .select("*")
      .eq("id", decisionId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async createJudgment(row: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from("pops_judgments").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  async createRewardDecision(row: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from("pops_reward_decisions").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  async createPrivacyReceipt(row: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from("pops_privacy_receipts").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }
  // Compatibility adapter for legacy callers.
  async getSessionBySessionAndUser(sessionId: string, userId: string): Promise<PopsSessionRecord | null> {
    return this.getSessionForUser(sessionId, userId);
  }
}
