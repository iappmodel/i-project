import type { ProofReviewStatus } from "../types/proof-packet-v0.types.js";

/** POP trust tiers (v2) — drives release delay and auto-settle eligibility. */
export type PopTrustTier = "t0_new" | "t1_established" | "t2_trusted";

export const POP_TRUST_TIERS: readonly PopTrustTier[] = [
  "t0_new",
  "t1_established",
  "t2_trusted"
] as const;

/** Default release delays (seconds) when env overrides are unset. */
export const DEFAULT_RELEASE_DELAY_SECONDS_BY_TIER: Record<PopTrustTier, number> = {
  t0_new: 3600,
  t1_established: 900,
  t2_trusted: 0
};

export function isPopTrustTier(value: string): value is PopTrustTier {
  return (POP_TRUST_TIERS as readonly string[]).includes(value);
}

function readEnvSeconds(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Per-tier release delay table (env-tunable). */
export function readReleaseDelaySecondsByTier(): Record<PopTrustTier, number> {
  const legacy = readEnvSeconds("POP_RELEASE_DELAY_SECONDS", 0);
  return {
    t0_new: readEnvSeconds("POP_TRUST_T0_DELAY_SECONDS", legacy > 0 ? legacy : 3600),
    t1_established: readEnvSeconds("POP_TRUST_T1_DELAY_SECONDS", 900),
    t2_trusted: readEnvSeconds("POP_TRUST_T2_DELAY_SECONDS", 0)
  };
}

function parseAllowlist(envName: string): Set<string> {
  const raw = process.env[envName]?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );
}

/**
 * Resolve trust tier for a hold (server-side only).
 * Allowlists: POP_TRUST_T2_ALLOWLIST, POP_TRUST_T1_ALLOWLIST (comma-separated localUserRef).
 * Default: POP_DEFAULT_TRUST_TIER or t0_new.
 */
export function resolveTrustTier(input: {
  localUserRef: string;
  hint?: string | null;
}): PopTrustTier {
  const defaultTier = process.env.POP_DEFAULT_TRUST_TIER?.trim();
  if (defaultTier && isPopTrustTier(defaultTier)) {
    return defaultTier;
  }
  if (input.hint && isPopTrustTier(input.hint)) {
    return input.hint;
  }
  const t2 = parseAllowlist("POP_TRUST_T2_ALLOWLIST");
  if (t2.has(input.localUserRef)) return "t2_trusted";
  const t1 = parseAllowlist("POP_TRUST_T1_ALLOWLIST");
  if (t1.has(input.localUserRef)) return "t1_established";
  return "t0_new";
}

export function releaseDelaySecondsForTier(tier: PopTrustTier): number {
  return readReleaseDelaySecondsByTier()[tier];
}

/** Only top tier may auto-settle when POP_SERVER_AUTO_SETTLE=true. */
export function isAutoSettleEligibleTier(tier: PopTrustTier): boolean {
  return tier === "t2_trusted";
}

export function computeReleaseEligibleAtForTier(
  submittedAtIso: string,
  reviewStatus: ProofReviewStatus,
  tier: PopTrustTier
): string | null {
  if (reviewStatus !== "approved" && reviewStatus !== "partial") {
    return null;
  }
  const delaySec = releaseDelaySecondsForTier(tier);
  const base = Date.parse(submittedAtIso);
  if (!Number.isFinite(base)) {
    return null;
  }
  return new Date(base + delaySec * 1000).toISOString();
}

export function canServerAutoSettleNowForTier(
  reviewStatus: ProofReviewStatus,
  tier: PopTrustTier,
  releaseEligibleAt: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!isAutoSettleEligibleTier(tier)) {
    return false;
  }
  if (reviewStatus !== "approved" && reviewStatus !== "partial") {
    return false;
  }
  if (!releaseEligibleAt) {
    return true;
  }
  const at = Date.parse(releaseEligibleAt);
  return Number.isFinite(at) && at <= nowMs;
}
