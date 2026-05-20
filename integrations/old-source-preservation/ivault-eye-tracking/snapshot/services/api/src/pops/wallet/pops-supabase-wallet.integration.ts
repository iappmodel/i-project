import { supabaseAdmin } from "../../config/supabase";
import type {
  CreatePendingRewardInput,
  DenyRewardInput,
  HoldRewardInput,
  PopsWalletIntegration,
  ReleaseRewardInput,
  WalletDenyIntent,
  WalletHoldIntent,
  WalletReleaseIntent,
  WalletTransactionIntent
} from "../rewards/pops-wallet-integration";

function nowIso(): string {
  return new Date().toISOString();
}

function uuidFromDecisionId(decisionId: string): string {
  return decisionId.replace(/^pops_reward_decision_/, "");
}

/** Map minor units to numeric column (USD: cents → dollars; on-ledger coins: store minor in metadata). */
function amountColumn(coinType: string, amountMinor: number): number {
  if (coinType === "USD") return Math.max(0, amountMinor) / 100;
  return Math.max(0, amountMinor);
}

/**
 * Persists wallet reward intents for P.O.P.S — does not mint ledger lines (wallet engine owns settlement).
 */
export class SupabasePopsWalletIntegration implements PopsWalletIntegration {
  async createPendingReward(input: CreatePendingRewardInput): Promise<WalletTransactionIntent> {
    const decisionUuid = uuidFromDecisionId(input.decisionId);
    const status =
      input.status === "PENDING_REVIEW"
        ? "PENDING_REVIEW"
        : input.hold
          ? "PENDING_REVIEW"
          : "PENDING";

    const { data, error } = await supabaseAdmin
      .from("pops_wallet_reward_intents")
      .insert({
        reward_decision_id: decisionUuid,
        session_id: input.sessionId,
        user_id: input.userId,
        campaign_id: null,
        coin_type: input.coinType,
        amount: amountColumn(input.coinType, input.amountMinor),
        status,
        hold_reason: input.hold ? "pops_pending_review" : null,
        metadata: { source: "pops_mvp", amountMinor: input.amountMinor }
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from("pops_reward_decisions")
      .update({ wallet_intent_id: data.id })
      .eq("id", decisionUuid);

    return {
      intentId: data.id,
      kind: "PENDING_REWARD",
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      coinType: input.coinType,
      status: input.status,
      hold: input.hold,
      createdAt: nowIso()
    };
  }

  async holdReward(input: HoldRewardInput): Promise<WalletHoldIntent> {
    const decisionUuid = uuidFromDecisionId(input.decisionId);
    const { data, error } = await supabaseAdmin
      .from("pops_wallet_reward_intents")
      .insert({
        reward_decision_id: decisionUuid,
        session_id: input.sessionId,
        user_id: input.userId,
        campaign_id: null,
        coin_type: input.coinType,
        amount: amountColumn(input.coinType, input.amountMinor),
        status: "HELD",
        hold_reason: input.reason,
        metadata: { source: "pops_mvp", amountMinor: input.amountMinor }
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabaseAdmin.from("pops_reward_decisions").update({ wallet_intent_id: data.id }).eq("id", decisionUuid);

    return {
      holdId: data.id,
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      coinType: input.coinType,
      reason: input.reason,
      createdAt: nowIso()
    };
  }

  async releaseReward(input: ReleaseRewardInput): Promise<WalletReleaseIntent> {
    return {
      releaseId: `noop_${crypto.randomUUID()}`,
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      coinType: input.coinType,
      createdAt: nowIso()
    };
  }

  async denyReward(input: DenyRewardInput): Promise<WalletDenyIntent> {
    return {
      denyId: `deny_${crypto.randomUUID()}`,
      decisionId: input.decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      decision: input.decision,
      reasonCodes: input.reasonCodes,
      createdAt: nowIso()
    };
  }
}
