import type { Json } from "@/types/alphabet/database.types";

/** In-memory append-only Alphabet events for admin-console demos (mirrors API persistence shape). */
const rows: Array<{
  event_id: string;
  user_id: string | null;
  coin_code: string | null;
  event_type: string;
  object_type: string | null;
  object_id: string | null;
  source_context: string;
  raw_score: number | null;
  quality_score: number | null;
  trust_score_at_event: number | null;
  risk_score: number | null;
  age_band: string | null;
  verification_status: string;
  metadata: Json;
  created_at: string;
}> = [];

export async function insertAlphabetEvent(params: {
  /** When omitted, a new evt_* id is generated. */
  eventId?: string | null;
  userId?: string | null;
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
  const eventId = params.eventId?.trim() ? String(params.eventId) : `evt_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const row = {
    event_id: eventId,
    user_id: params.userId ?? null,
    coin_code: params.coinCode ?? null,
    event_type: params.eventType,
    object_type: params.objectType ?? null,
    object_id: params.objectId ?? null,
    source_context: params.sourceContext,
    raw_score: params.rawScore ?? null,
    quality_score: params.qualityScore ?? null,
    trust_score_at_event: params.trustScoreAtEvent ?? null,
    risk_score: params.riskScore ?? null,
    age_band: params.ageBand ?? null,
    verification_status: params.verificationStatus,
    metadata: (params.metadata ?? {}) as Json,
    created_at: now
  };
  rows.push(row);
  return { event_id: eventId };
}

export function listAlphabetEventsInMemory(): typeof rows {
  return [...rows];
}
