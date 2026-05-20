/**
 * User-facing P.O.P.S profile summary (Stage 37).
 * Demo/mock layer — swap `fetchUserPopsSummary` for API-backed data when wired.
 *
 * Intentionally omits: exact trust scores, fraud model internals, exploit-sensitive
 * reason codes, cross-user comparisons, manipulative behavior scoring.
 */

export type VerificationReliabilityState = "strong" | "good" | "limited" | "under_review";

export interface UserPopsSummaryMetrics {
  verifiedMoments: number;
  rewardsVerified: number;
  rewardsPending: number;
  rewardsUnderReview: number;
  privacyReceipts: number;
  disputeCount: number;
  /** Qualitative band only — never an exact numeric trust score. */
  verificationReliability: VerificationReliabilityState;
  /** Product-defined label (e.g. tier name), optional. */
  trustTierLabel?: string;
}

export interface UserVerifiedMomentListItem {
  id: string;
  sessionTypeLabel: string;
  occurredAt: string;
  summary: string;
}

export type UserFacingRewardDecision = "Verified" | "Pending" | "Under review" | "Not eligible";

export interface UserPopsReceiptListItem {
  id: string;
  sessionTypeLabel: string;
  date: string;
  decision: UserFacingRewardDecision;
  proofLevelLabel: string;
  rawDataStored: boolean;
}

export type UserPopsDisputeStatus = "Open" | "In review" | "Resolved" | "Closed";

export interface UserPopsDisputeListItem {
  id: string;
  rewardLabel: string;
  status: UserPopsDisputeStatus;
  lastUpdated: string;
}

export interface UserPopsSummaryPayload {
  metrics: UserPopsSummaryMetrics;
  recentVerifiedMoments: UserVerifiedMomentListItem[];
  receipts: UserPopsReceiptListItem[];
  disputes: UserPopsDisputeListItem[];
}

const MOCK_USER_POPS_SUMMARY: UserPopsSummaryPayload = {
  metrics: {
    verifiedMoments: 42,
    rewardsVerified: 38,
    rewardsPending: 2,
    rewardsUnderReview: 1,
    privacyReceipts: 12,
    disputeCount: 1,
    verificationReliability: "good",
    trustTierLabel: "Standard"
  },
  recentVerifiedMoments: [
    {
      id: "vm_001",
      sessionTypeLabel: "Sponsored watch session",
      occurredAt: "2026-04-26T14:22:00.000Z",
      summary: "Presence verified for reward completion."
    },
    {
      id: "vm_002",
      sessionTypeLabel: "Feed attention check-in",
      occurredAt: "2026-04-25T09:05:00.000Z",
      summary: "Enough multimodal presence to count the moment."
    },
    {
      id: "vm_003",
      sessionTypeLabel: "Offer activation",
      occurredAt: "2026-04-24T18:40:00.000Z",
      summary: "Session met proof requirements."
    }
  ],
  receipts: [
    {
      id: "rcpt_101",
      sessionTypeLabel: "Sponsored watch session",
      date: "2026-04-26T14:22:00.000Z",
      decision: "Verified",
      proofLevelLabel: "Standard proof",
      rawDataStored: false
    },
    {
      id: "rcpt_102",
      sessionTypeLabel: "Wallet-linked reward",
      date: "2026-04-23T11:10:00.000Z",
      decision: "Pending",
      proofLevelLabel: "Elevated proof",
      rawDataStored: false
    },
    {
      id: "rcpt_103",
      sessionTypeLabel: "Campaign bonus",
      date: "2026-04-20T08:00:00.000Z",
      decision: "Under review",
      proofLevelLabel: "Standard proof",
      rawDataStored: true
    }
  ],
  disputes: [
    {
      id: "dsp_01",
      rewardLabel: "Spring watch-and-earn",
      status: "In review",
      lastUpdated: "2026-04-21T16:30:00.000Z"
    }
  ]
};

export function formatUserPopsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Derives a user-facing reliability band from an internal consistency score (0–1).
 * The numeric value must not be shown in UI — only the returned state.
 */
export function verificationReliabilityFromInternalScore(
  internalScore01: number,
  flags: { accountUnderReview: boolean }
): VerificationReliabilityState {
  if (flags.accountUnderReview) {
    return "under_review";
  }
  const s = Math.max(0, Math.min(1, internalScore01));
  if (s >= 0.86) {
    return "strong";
  }
  if (s >= 0.65) {
    return "good";
  }
  return "limited";
}

export async function fetchUserPopsSummary(_userId?: string): Promise<UserPopsSummaryPayload> {
  await new Promise((r) => setTimeout(r, 120));
  return structuredClone(MOCK_USER_POPS_SUMMARY);
}

export function getMockUserPopsSummarySnapshot(): UserPopsSummaryPayload {
  return structuredClone(MOCK_USER_POPS_SUMMARY);
}
