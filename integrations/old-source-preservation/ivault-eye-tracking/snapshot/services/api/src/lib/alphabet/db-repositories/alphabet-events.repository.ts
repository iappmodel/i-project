import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

/** Stable internal user id when no end-user applies (matches NOT NULL user_id on alphabet_events). */
export const ALPHABET_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

function parseUuidIfValid(id: string | null | undefined): string | null {
  if (!id) return null;
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(id) ? id : null;
}

export async function insertAlphabetEvent(params: {
  userId: string | null;
  coinCode?: string | null;
  eventType: string;
  objectType?: string | null;
  objectId?: string | null;
  sourceContext: string;
  rawScore?: number | null;
  qualityScore?: number | null;
  trustScoreAtEvent?: number | null;
  riskScore?: number | null;
  ageBand?: string | null;
  verificationStatus: string;
  metadata?: Json;
}): Promise<{ event_id: string }> {
  const db = createServiceDbClient();
  const userId = params.userId ?? ALPHABET_SYSTEM_USER_ID;

  const { data, error } = await db
    .from("alphabet_events")
    .insert({
      user_id: userId,
      coin_code: params.coinCode ?? null,
      event_type: params.eventType,
      object_type: params.objectType ?? null,
      object_id: parseUuidIfValid(params.objectId ?? undefined),
      source_context: params.sourceContext,
      raw_score: params.rawScore ?? null,
      quality_score: params.qualityScore ?? null,
      trust_score_at_event: params.trustScoreAtEvent ?? null,
      risk_score: params.riskScore ?? null,
      age_band: params.ageBand ?? null,
      verification_status: params.verificationStatus,
      metadata_json: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("event_id")
    .single();

  if (error) throw error;
  return { event_id: data.event_id as string };
}
