import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";

export async function insertAlphabetEvent(params: {
  userId?: string | null;
  coinCode: string;
  eventType: string;
  objectType: string;
  objectId: string;
  sourceContext: string;
  rawScore?: number | null;
  qualityScore?: number | null;
  trustScoreAtEvent?: number | null;
  riskScore?: number | null;
  ageBand?: string | null;
  verificationStatus: string;
  metadata?: Json;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("alphabet_events")
    .insert({
      user_id: params.userId ?? null,
      coin_code: params.coinCode,
      event_type: params.eventType,
      object_type: params.objectType,
      object_id: params.objectId,
      source_context: params.sourceContext,
      raw_score: params.rawScore ?? null,
      quality_score: params.qualityScore ?? null,
      trust_score_at_event: params.trustScoreAtEvent ?? null,
      risk_score: params.riskScore ?? null,
      age_band: params.ageBand ?? null,
      verification_status: params.verificationStatus,
      metadata: params.metadata ?? {}
    })
    .select("event_id")
    .single();

  if (error) throw error;
  return { event_id: data.event_id as string };
}
