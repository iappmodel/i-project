import { createServiceDbClient } from "../db-client";
import type { DbPolicyDecision, Json } from "@/types/alphabet/database.types";

export async function insertPolicyDecisionDb(params: {
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  actionType: string;
  primaryDomain: string;
  decision: string;
  status: string;
  gateResults?: Json;
  riskSignals?: Json;
  ageBand: string;
  trustScore?: number;
  uValueScore?: number;
  downstreamInstructions?: Json;
  metadata?: Json;
}): Promise<DbPolicyDecision> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("policy_decisions")
    .insert({
      user_id: params.userId,
      creator_id: params.creatorId ?? null,
      business_id: params.businessId ?? null,
      wallet_id: params.walletId ?? null,
      content_id: params.contentId ?? null,
      campaign_id: params.campaignId ?? null,
      grant_eligibility_id: params.grantEligibilityId ?? null,
      action_type: params.actionType,
      primary_domain: params.primaryDomain,
      decision: params.decision,
      status: params.status,
      gate_results: params.gateResults ?? [],
      risk_signals: params.riskSignals ?? {},
      age_band: params.ageBand,
      trust_score: params.trustScore ?? 0,
      u_value_score: params.uValueScore ?? 0,
      downstream_instructions: params.downstreamInstructions ?? [],
      metadata: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbPolicyDecision;
}

export async function getPolicyDecisionDb(
  policyDecisionId: string
): Promise<DbPolicyDecision | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("policy_decisions")
    .select("*")
    .eq("policy_decision_id", policyDecisionId)
    .maybeSingle();

  if (error) throw error;
  return data as DbPolicyDecision | null;
}
