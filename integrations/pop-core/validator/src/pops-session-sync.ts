import type { ProofPacketV0, ProofReviewRecord } from "@pop-core/backend";

import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";

export interface PopsSessionRow {
  session_id: string;
  user_id: string | null;
  local_user_ref: string;
  offer_id: string;
  content_id: string | null;
  device_id_hash: string | null;
  proof_level: string;
  state: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  acs_score: number | null;
  review_status: string;
  fraud_flag: boolean;
  privacy_receipt: Record<string, unknown> | null;
}

export function buildPopsSessionRow(
  packet: ProofPacketV0,
  review: ProofReviewRecord
): PopsSessionRow {
  const perception = packet.signals?.perception;
  const acsScore =
    perception && typeof perception.score === "number"
      ? Math.round(perception.score)
      : null;

  const fraudFlag = review.status === "escalated" || review.status === "rejected";

  return {
    session_id: packet.sessionId,
    user_id: packet.userId ?? null,
    local_user_ref: packet.localUserRef,
    offer_id: packet.offerId,
    content_id: packet.contentId ?? null,
    device_id_hash: packet.deviceIdHash ?? null,
    proof_level: "LEVEL_2_ATTENTION",
    state: "COMPLETED",
    started_at: packet.startedAt,
    ended_at: packet.endedAt,
    duration_ms: packet.durationMs ?? null,
    acs_score: acsScore,
    review_status: review.status,
    fraud_flag: fraudFlag,
    privacy_receipt: {
      derivedSignalsOnly: true,
      validatorVersion: "POP_VALIDATOR_STUB_V1"
    }
  };
}

export interface PopsSessionSyncResult {
  enabled: boolean;
  outcome?: "created" | "existing" | "skipped";
  error?: string;
}

export async function syncPopsSessionToSupabase(
  packet: ProofPacketV0,
  review: ProofReviewRecord,
  client: SupabaseSettlementClient
): Promise<PopsSessionSyncResult> {
  if (!client.isEnabled) {
    return { enabled: false, outcome: "skipped" };
  }

  try {
    const row = buildPopsSessionRow(packet, review);
    const outcome = await client.upsertPopsSession(row);
    return { enabled: true, outcome };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Supabase error";
    return { enabled: true, outcome: "skipped", error: message };
  }
}
