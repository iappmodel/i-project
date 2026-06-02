import type { PendingHoldRecord, ProofReviewStatus } from "@pop-core/backend";
import { isPopTrustTier, type PopTrustTier } from "@pop-core/backend";

import type { PopPendingHoldRow } from "./supabase-settlement.js";

/** Map Supabase `pop_pending_holds` row → [PendingHoldRecord] (read path). */
export function pendingHoldFromSupabaseRow(
  row: Record<string, unknown>
): PendingHoldRecord {
  const tierRaw = row.trust_tier_at_hold;
  const trustTier: PopTrustTier | null =
    typeof tierRaw === "string" && isPopTrustTier(tierRaw) ? tierRaw : "t0_new";

  const holdStatus =
    row.hold_status === "appeal_pending" ? "appeal_pending" : "pending";

  return {
    sessionId: String(row.session_id),
    userId: row.user_id ? String(row.user_id) : null,
    localUserRef: String(row.local_user_ref),
    contentId: String(row.content_id),
    offerId: String(row.offer_id),
    artifactId: row.artifact_id ? String(row.artifact_id) : null,
    packetId: null,
    amount: Number(row.amount),
    amountBreakdown: {
      computedAmountMinor: Number(row.amount),
      currency: row.currency === "vicoin" ? "VICOIN" : "ICOIN",
      offerId: String(row.offer_id)
    },
    status: holdStatus,
    releaseStatus: String(row.release_status) as PendingHoldRecord["releaseStatus"],
    createdAt: String(row.created_at),
    reviewAudit: {
      sessionId: String(row.session_id),
      reviewedAt: String(row.created_at),
      reviewStatus: String(row.review_status) as ProofReviewStatus,
      artifactId: row.artifact_id ? String(row.artifact_id) : null,
      packetId: null,
      lifecycleEventCount: 0
    },
    releaseEligibleAt: row.release_eligible_at
      ? String(row.release_eligible_at)
      : null,
    appealExpiresAt: row.appeal_expires_at ? String(row.appeal_expires_at) : null,
    reverifyUsed: row.reverify_used === true,
    trustTierAtHold: trustTier
  };
}

export function isPopPendingHoldRow(row: Record<string, unknown>): row is PopPendingHoldRow {
  return typeof row.session_id === "string" && typeof row.local_user_ref === "string";
}
