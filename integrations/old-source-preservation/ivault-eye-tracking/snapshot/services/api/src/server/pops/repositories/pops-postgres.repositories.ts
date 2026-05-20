import { supabaseAdmin } from "../../../config/supabase";
import type {
  PopsJudgmentInsert,
  PopsJudgmentRepository,
  PopsPrivacyReceiptInsert,
  PopsPrivacyReceiptRepository,
  PopsRewardDecisionInsert,
  PopsRewardDecisionRepository,
  PopsWalletIntentInsert,
  PopsWalletIntentRepository
} from "./pops-repository.types";

export class PostgresPopsJudgmentRepository implements PopsJudgmentRepository {
  async createJudgment(row: PopsJudgmentInsert): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseAdmin.from("pops_judgments").insert(row).select("*").single();
    if (error) throw error;
    return (data ?? {}) as Record<string, unknown>;
  }

  async getJudgmentBySession(sessionId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabaseAdmin
      .from("pops_judgments")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Record<string, unknown> | null) ?? null;
  }
}

export class PostgresPopsRewardDecisionRepository implements PopsRewardDecisionRepository {
  async createRewardDecision(row: PopsRewardDecisionInsert): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseAdmin
      .from("pops_reward_decisions")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return (data ?? {}) as Record<string, unknown>;
  }

  async getRewardDecisionBySession(sessionId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabaseAdmin
      .from("pops_reward_decisions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Record<string, unknown> | null) ?? null;
  }
}

export class PostgresPopsWalletIntentRepository implements PopsWalletIntentRepository {
  async createWalletIntent(row: PopsWalletIntentInsert): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseAdmin
      .from("pops_wallet_reward_intents")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return (data ?? {}) as Record<string, unknown>;
  }

  async getWalletIntentByRewardDecision(
    rewardDecisionId: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabaseAdmin
      .from("pops_wallet_reward_intents")
      .select("*")
      .eq("reward_decision_id", rewardDecisionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Record<string, unknown> | null) ?? null;
  }
}

export class PostgresPopsPrivacyReceiptRepository implements PopsPrivacyReceiptRepository {
  async createPrivacyReceipt(row: PopsPrivacyReceiptInsert): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseAdmin
      .from("pops_privacy_receipts")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return (data ?? {}) as Record<string, unknown>;
  }

  async getPrivacyReceiptBySession(sessionId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabaseAdmin
      .from("pops_privacy_receipts")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Record<string, unknown> | null) ?? null;
  }
}
