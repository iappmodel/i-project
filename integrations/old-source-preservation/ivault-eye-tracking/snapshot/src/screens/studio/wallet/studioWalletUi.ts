import type { RevealEligibilityViewer } from "../magic/evaluateRevealEligibility";
import type { MagicReveal } from "../studioTypes";
import type { StudioRevealUnlock, StudioUnlockStatus, StudioWalletAccount } from "./studioWalletTypes";

export function findWalletAccountByType(
  accounts: StudioWalletAccount[],
  type: StudioWalletAccount["type"]
): StudioWalletAccount | undefined {
  return accounts.find((a) => a.type === type);
}

export function walletAccountToEligibilityViewer(a: StudioWalletAccount): RevealEligibilityViewer {
  const walletBalances: Record<string, number> = {};
  for (const b of a.balances) {
    walletBalances[b.coin] = b.available;
  }
  return {
    id: a.userId,
    age: a.age,
    trustScore: a.trustScore ?? 0,
    isVerifiedHuman: a.isVerifiedHuman ?? false,
    isFollower: a.isFollower ?? false,
    isSubscriber: a.isSubscriber ?? false,
    walletBalances,
  };
}

export type RevealUnlockSimBadge =
  | { kind: "none" }
  | { kind: "unlocked"; label: string }
  | { kind: "pending"; label: string }
  | { kind: "blocked"; label: string }
  | { kind: "collective"; label: string; progress: number };

export type SimulatedUnlockBadgeOptions = {
  /** Running total tips on mock post (Stage 3 collective simulation). */
  collectiveTotalTips?: number;
};

function collectiveProgressParts(
  reveal: MagicReveal,
  unlocks: StudioRevealUnlock[],
  viewerAccountId: string,
  collectiveTotalTips?: number
): { current: number; goal: number } {
  const goal = reveal.eligibility.revealAfterTotalTips ?? reveal.collectiveProgress?.goal ?? 100;
  const relevant = unlocks
    .filter((u) => u.revealId === reveal.id && u.viewerAccountId === viewerAccountId && u.unlockAction === "collective_contribute")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const latest = relevant[0];
  const meta = latest?.metadata as { collectiveGoal?: number; newTotalTips?: number } | undefined;
  const current =
    meta?.newTotalTips ??
    collectiveTotalTips ??
    reveal.collectiveProgress?.current ??
    0;
  const g = meta?.collectiveGoal ?? goal;
  return { current, goal: Math.max(1, g) };
}

/** Latest simulated unlock for this reveal + demo viewer wallet account id. */
export function simulatedUnlockBadge(
  unlocks: StudioRevealUnlock[],
  reveal: MagicReveal,
  viewerAccountId: string,
  options?: SimulatedUnlockBadgeOptions
): RevealUnlockSimBadge {
  const relevant = unlocks
    .filter((u) => u.revealId === reveal.id && u.viewerAccountId === viewerAccountId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const u = relevant[0];
  if (!u) {
    if (reveal.revealType === "collective_reveal") {
      const { current, goal } = collectiveProgressParts(reveal, unlocks, viewerAccountId, options?.collectiveTotalTips);
      const p = Math.min(100, (current / goal) * 100);
      if (p > 0 && p < 100) return { kind: "collective", label: `${Math.round(p)}%`, progress: p };
    }
    return { kind: "none" };
  }

  if (u.status === "blocked" || u.unlockStatus === "blocked") {
    return { kind: "blocked", label: "Blocked" };
  }
  if (reveal.revealType === "collective_reveal" && u.unlockAction === "collective_contribute" && u.status !== "unlocked") {
    const { current, goal } = collectiveProgressParts(reveal, unlocks, viewerAccountId, options?.collectiveTotalTips);
    const p = Math.min(100, (current / goal) * 100);
    return { kind: "collective", label: `${Math.round(p)}%`, progress: p };
  }
  if (u.status === "awaiting_confirmation" || u.status === "verifying_action" || u.verificationStatus === "pending") {
    return { kind: "pending", label: u.verificationStatus === "pending" ? "Verify" : "Pending" };
  }
  if (u.status === "unlocked" && u.unlockStatus === "unlocked") {
    return { kind: "unlocked", label: "Unlocked" };
  }
  if (reveal.revealType === "collective_reveal") {
    const { current, goal } = collectiveProgressParts(reveal, unlocks, viewerAccountId, options?.collectiveTotalTips);
    const p = Math.min(100, (current / goal) * 100);
    return { kind: "collective", label: `${Math.round(p)}%`, progress: p };
  }
  return { kind: "pending", label: u.status.replace(/_/g, " ") };
}

export function countUnlocksForReveal(unlocks: StudioRevealUnlock[], revealId: string): number {
  return unlocks.filter((u) => u.revealId === revealId).length;
}

export function pendingSettlementForReveal(
  unlocks: StudioRevealUnlock[],
  revealId: string,
  viewerAccountId: string
): { count: number; pendingICoin: number } {
  const list = unlocks.filter(
    (u) => u.revealId === revealId && u.viewerAccountId === viewerAccountId && u.settlementStatus === "pending"
  );
  const pendingICoin = list.reduce((s, u) => (u.coin === "iCoin" ? s + u.creatorGrossAmount : s), 0);
  return { count: list.length, pendingICoin };
}

export function isUnlockVisuallyDone(status: StudioUnlockStatus): boolean {
  return status === "unlocked";
}
