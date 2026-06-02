import type { ProofReviewStatus } from "@pop-core/backend";

/** Server-side settlement policy (not client VITE_AUTO_SETTLE). */
export interface ServerSettlementPolicy {
  /** Seconds after validate before approved holds may settle (0 = immediate when auto-settle on). */
  releaseDelaySeconds: number;
  /** When true, validator may call settle after validate for eligible holds. */
  serverAutoSettle: boolean;
  /** Days until pending/escalated appeal expires without re-verification. */
  appealExpiryDays: number;
}

export function readServerSettlementPolicy(): ServerSettlementPolicy {
  const releaseDelaySeconds = Number(process.env.POP_RELEASE_DELAY_SECONDS ?? "0");
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
  policy: ServerSettlementPolicy
): string | null {
  if (reviewStatus !== "approved" && reviewStatus !== "partial") {
    return null;
  }
  const base = Date.parse(submittedAtIso);
  if (!Number.isFinite(base)) {
    return null;
  }
  return new Date(base + policy.releaseDelaySeconds * 1000).toISOString();
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
  nowMs: number = Date.now()
): boolean {
  if (reviewStatus !== "approved" && reviewStatus !== "partial") {
    return false;
  }
  if (!releaseEligibleAt) {
    return true;
  }
  const at = Date.parse(releaseEligibleAt);
  return Number.isFinite(at) && at <= nowMs;
}
