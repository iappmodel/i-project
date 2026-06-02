import type { ProofReviewStatus, PopTrustTier } from "@pop-core/backend";
import {
  computeReleaseEligibleAtForTier,
  canServerAutoSettleNowForTier,
  releaseDelaySecondsForTier
} from "@pop-core/backend";

/** Server-side settlement policy (not client VITE_AUTO_SETTLE). */
export interface ServerSettlementPolicy {
  /** Legacy single delay; maps to t0 when tier env unset. */
  releaseDelaySeconds: number;
  /** When true, validator may call settle after validate for t2_trusted holds only. */
  serverAutoSettle: boolean;
  /** Days until pending/escalated appeal expires without re-verification. */
  appealExpiryDays: number;
}

export function readServerSettlementPolicy(): ServerSettlementPolicy {
  const releaseDelaySeconds = releaseDelaySecondsForTier("t0_new");
  const serverAutoSettle = process.env.POP_SERVER_AUTO_SETTLE === "true";
  const appealExpiryDays = Number(process.env.POP_APPEAL_EXPIRY_DAYS ?? "7");
  return {
    releaseDelaySeconds: Number.isFinite(releaseDelaySeconds) ? releaseDelaySeconds : 0,
    serverAutoSettle,
    appealExpiryDays: Number.isFinite(appealExpiryDays) ? appealExpiryDays : 7
  };
}

export function computeReleaseEligibleAt(
  submittedAtIso: string,
  reviewStatus: ProofReviewStatus,
  _policy: ServerSettlementPolicy,
  trustTier: PopTrustTier = "t0_new"
): string | null {
  return computeReleaseEligibleAtForTier(submittedAtIso, reviewStatus, trustTier);
}

export function computeAppealExpiresAt(
  submittedAtIso: string,
  policy: ServerSettlementPolicy
): string {
  const base = Date.parse(submittedAtIso);
  const ms = Number.isFinite(base)
    ? base + policy.appealExpiryDays * 24 * 60 * 60 * 1000
    : Date.now() + policy.appealExpiryDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export function canServerAutoSettleNow(
  reviewStatus: ProofReviewStatus,
  releaseEligibleAt: string | null,
  nowMs: number = Date.now(),
  trustTier: PopTrustTier = "t0_new"
): boolean {
  return canServerAutoSettleNowForTier(
    reviewStatus,
    trustTier,
    releaseEligibleAt,
    nowMs
  );
}
