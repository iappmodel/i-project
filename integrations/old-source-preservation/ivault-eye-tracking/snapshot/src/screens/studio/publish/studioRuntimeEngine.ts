/**
 * [ i ] Studio Stage 4 — feed runtime simulation over immutable PostPackage.
 * Eligibility: Stage 2 `evaluateRevealEligibility`; unlock ledger: Stage 3 `simulateRevealUnlock` (wired in store).
 */

import type { MagicReveal } from "../studioTypes";
import type { StudioWalletAccount } from "../wallet/studioWalletTypes";
import { evaluateRevealEligibility } from "../magic/evaluateRevealEligibility";
import type {
  PostDisclosure,
  PostPackage,
  PostRuntimeStateResult,
  PostRuntimeUnlockState,
  PostRuntimeViewerAccount,
  RuntimeTapResolution,
} from "./studioPublishTypes";

export function walletAccountToPostRuntimeViewer(account: StudioWalletAccount): PostRuntimeViewerAccount {
  const walletBalances: Record<string, number> = {};
  for (const b of account.balances) {
    walletBalances[b.coin] = b.available;
  }
  return {
    id: account.userId,
    age: account.age,
    trustScore: account.trustScore ?? 0,
    isVerifiedHuman: account.isVerifiedHuman ?? false,
    isFollower: account.isFollower ?? false,
    isSubscriber: account.isSubscriber ?? false,
    walletBalances,
  };
}

function unlockSet(unlocks: PostRuntimeUnlockState): Set<string> {
  if (unlocks.unlockedRevealIds instanceof Set) return unlocks.unlockedRevealIds;
  return new Set(unlocks.unlockedRevealIds ?? []);
}

function timelineActive(r: MagicReveal, playheadMs: number): boolean {
  if (r.status === "deleted") return false;
  return playheadMs >= r.timelineStartMs && playheadMs < r.timelineEndMs;
}

/** Magic overlays visible at playhead (includes locked / blocked for UI). */
export function getVisibleRuntimeReveals(postPackage: PostPackage, playheadMs: number): MagicReveal[] {
  return postPackage.magicReveals.filter((r) => timelineActive(r, playheadMs) && r.revealType !== "always_hidden");
}

export function getPostRuntimeState(input: {
  postPackage: PostPackage;
  viewerAccount: PostRuntimeViewerAccount;
  unlocks: PostRuntimeUnlockState;
  playheadMs: number;
}): PostRuntimeStateResult {
  const { postPackage, viewerAccount, unlocks, playheadMs } = input;
  const unlocked = unlockSet(unlocks);
  const visible = getVisibleRuntimeReveals(postPackage, playheadMs);
  const cfg = postPackage.runtimeConfig;

  const unlockedReveals: MagicReveal[] = [];
  const lockedReveals: MagicReveal[] = [];
  const blockedReveals: MagicReveal[] = [];

  for (const r of visible) {
    if (unlocked.has(r.id)) {
      unlockedReveals.push(r);
      continue;
    }
    if (r.safety.publishBlocked || r.safety.safetyStatus === "blocked" || r.status !== "active") {
      blockedReveals.push(r);
      continue;
    }
    lockedReveals.push(r);
  }

  const ageGateRequired =
    cfg.requireAgeGateBeforeView ||
    visible.some((r) => {
      if (unlocked.has(r.id)) return false;
      const min = r.eligibility.minAge;
      if (typeof min === "number") {
        return !viewerAccount.age || viewerAccount.age < min;
      }
      return r.safety.ageGateRequired;
    });

  const walletChipVisible = cfg.showWalletChip;

  const disclosuresToShow: PostDisclosure[] = postPackage.disclosures.filter((d) => d.visibleToViewer);

  return {
    visibleReveals: visible,
    lockedReveals,
    unlockedReveals,
    blockedReveals,
    ageGateRequired,
    walletChipVisible,
    disclosuresToShow,
  };
}

export function resolveRuntimeTap(input: {
  reveal: MagicReveal;
  viewerAccount: PostRuntimeViewerAccount;
  postPackage: PostPackage;
  unlocks: PostRuntimeUnlockState;
}): RuntimeTapResolution {
  const { reveal, viewerAccount, postPackage, unlocks } = input;
  const unlocked = unlockSet(unlocks);
  if (unlocked.has(reveal.id)) {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: true };
  }
  if (reveal.safety.publishBlocked || reveal.safety.safetyStatus === "blocked") {
    return {
      shouldOpenUnlockSheet: false,
      alreadyUnlocked: false,
      blockedReason: "Reveal blocked for publishing / runtime.",
      requiredAction: "none",
    };
  }
  if (!postPackage.runtimeConfig.allowMagicUnlocks) {
    return {
      shouldOpenUnlockSheet: false,
      alreadyUnlocked: false,
      blockedReason: "Magic unlocks disabled for this post.",
    };
  }

  const viewer = {
    id: viewerAccount.id,
    age: viewerAccount.age,
    trustScore: viewerAccount.trustScore,
    isVerifiedHuman: viewerAccount.isVerifiedHuman,
    isFollower: viewerAccount.isFollower,
    isSubscriber: viewerAccount.isSubscriber,
    walletBalances: viewerAccount.walletBalances,
  };
  const post = { verifiedViews: 100, totalTips: 80, publishedAt: postPackage.createdAt };
  const ev = evaluateRevealEligibility({
    reveal,
    viewer,
    post,
    now: new Date().toISOString(),
    forPreview: true,
  });
  if (!ev.eligible) {
    return {
      shouldOpenUnlockSheet: true,
      alreadyUnlocked: false,
      blockedReason: ev.blockedReason,
      requiredAction: ev.requiredAction,
    };
  }
  return { shouldOpenUnlockSheet: true, alreadyUnlocked: false };
}
