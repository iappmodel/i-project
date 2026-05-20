import { createServiceDbClient } from "../db-client";
import type { DbActionIntent, Json } from "@/types/alphabet/database.types";
import { ACTION_INTENT_RULES } from "@/data/alphabet/action-intent-rules";

function expirationForIntentType(intentType: string): string | null {
  const rule = ACTION_INTENT_RULES.find((r) => r.intentType === intentType && r.active);
  const mins = rule?.defaultExpirationMinutes ?? 60;
  return new Date(Date.now() + mins * 60 * 1000).toISOString();
}

export async function insertActionIntentDb(params: {
  intentType: string;
  intentSource: string;
  status: string;
  userId: string;
  actorUserId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  clientRequestId?: string | null;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  sourceEventIds?: string[];
  context: Json;
  riskSignals: Json;
  metadata?: Json;
  expiresAt?: string | null;
}): Promise<DbActionIntent> {
  const db = createServiceDbClient();

  const expiresAt =
    params.expiresAt ?? expirationForIntentType(params.intentType);

  const { data, error } = await db
    .from("action_intents")
    .insert({
      intent_type: params.intentType,
      intent_source: params.intentSource,
      status: params.status,
      user_id: params.userId,
      actor_user_id: params.actorUserId ?? null,
      creator_id: params.creatorId ?? null,
      business_id: params.businessId ?? null,
      wallet_id: params.walletId ?? null,
      content_id: params.contentId ?? null,
      campaign_id: params.campaignId ?? null,
      grant_eligibility_id: params.grantEligibilityId ?? null,
      session_id: params.sessionId ?? null,
      device_id: params.deviceId ?? null,
      client_request_id: params.clientRequestId ?? null,
      idempotency_key: params.idempotencyKey ?? null,
      dedupe_key: params.dedupeKey ?? null,
      source_event_ids: params.sourceEventIds ?? [],
      context: params.context as Record<string, unknown>,
      risk_signals: params.riskSignals as Record<string, unknown>,
      metadata: (params.metadata ?? {}) as Record<string, unknown>,
      expires_at: expiresAt
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbActionIntent;
}

export async function getActionIntentDb(
  actionIntentId: string
): Promise<DbActionIntent | null> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("action_intents")
    .select("*")
    .eq("action_intent_id", actionIntentId)
    .maybeSingle();

  if (error) throw error;
  return data as DbActionIntent | null;
}

export async function countActionIntentsByDedupeKeyDb(params: {
  userId: string;
  dedupeKey: string;
}): Promise<number> {
  const db = createServiceDbClient();

  const { count, error } = await db
    .from("action_intents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", params.userId)
    .eq("dedupe_key", params.dedupeKey);

  if (error) throw error;
  return count ?? 0;
}
