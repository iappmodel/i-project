import type { MagicReveal } from "../studioTypes";
import { evaluateRevealEligibility, type RevealEligibilityPost, type RevealEligibilityViewer } from "../magic/evaluateRevealEligibility";
import { applyLedgerEntries, createLedgerEntry, getBalance, hasSufficientBalance } from "./studioWalletLedger";
import { calculateMagicSettlement } from "./studioSettlementEngine";
import type {
  StudioCoin,
  StudioEligibilitySnapshot,
  StudioLedgerEntry,
  StudioRevealUnlock,
  StudioUnlockAction,
  StudioUnlockStatus,
  StudioWalletAccount,
  VerificationStatus,
  SettlementStatus,
} from "./studioWalletTypes";

export type SimulateRevealUnlockInput = {
  reveal: MagicReveal;
  viewerAccount: StudioWalletAccount;
  creatorAccount: StudioWalletAccount;
  platformAccount: StudioWalletAccount;
  escrowAccount: StudioWalletAccount;
  rewardPoolAccount: StudioWalletAccount;
  post: RevealEligibilityPost & { postId: string };
  amountOverride?: number;
  now: string;
  existingUnlocks: StudioRevealUnlock[];
  /** Runtime / package preview: treat draft reveals as previewable (Stage 4 feed sim). */
  forPreview?: boolean;
};

export type SimulateRevealUnlockResult = {
  unlock: StudioRevealUnlock;
  ledgerEntries: StudioLedgerEntry[];
  updatedAccounts: StudioWalletAccount[];
  updatedPostTips?: number;
  resultMessage: string;
  success: boolean;
};

function viewerToEligibility(v: StudioWalletAccount): RevealEligibilityViewer {
  const walletBalances: Record<string, number> = {};
  for (const b of v.balances) {
    walletBalances[b.coin] = b.available;
  }
  return {
    id: v.userId,
    age: v.age,
    trustScore: v.trustScore ?? 0,
    isVerifiedHuman: v.isVerifiedHuman ?? false,
    isFollower: v.isFollower ?? false,
    isSubscriber: v.isSubscriber ?? false,
    walletBalances,
  };
}

function snapEligibility(
  eligible: boolean,
  blockedReason?: string,
  requiredAction?: string,
  displayMessage?: string
): StudioEligibilitySnapshot {
  return {
    eligible,
    blockedReason,
    requiredAction,
    displayMessage: displayMessage ?? "",
  };
}

export function revealToUnlockAction(reveal: MagicReveal): StudioUnlockAction {
  switch (reveal.revealType) {
    case "always_hidden":
      return "wait";
    case "free_tap_reveal":
      return "free";
    case "tip_to_reveal":
      return "tip";
    case "pay_to_reveal":
      return "pay";
    case "watch_to_reveal":
      return "watch_ad";
    case "follow_to_reveal":
      return "follow";
    case "subscribe_to_reveal":
      return "subscribe";
    case "trust_to_reveal":
      return "build_trust";
    case "age_to_reveal":
      return "verify_age";
    case "location_to_reveal":
      return "location_check";
    case "time_to_reveal":
      return "wait";
    case "collective_reveal":
      return "collective_contribute";
    case "creator_approval_reveal":
      return "request_creator_approval";
    default:
      return "wait";
  }
}

function privacyMonetizationBlocked(reveal: MagicReveal, action: StudioUnlockAction): boolean {
  if (reveal.safety.safetyClass !== "privacy_sensitive") return false;
  if (action !== "tip" && action !== "pay") return false;
  if (reveal.safety.monetizationAllowed) return false;
  return true;
}

function permanentAlreadyUnlocked(reveal: MagicReveal, viewerId: string, unlocks: StudioRevealUnlock[]): boolean {
  if (reveal.unlockPolicy.duration !== "permanent") return false;
  return unlocks.some(
    (u) =>
      u.revealId === reveal.id &&
      u.viewerAccountId === viewerId &&
      u.status === "unlocked" &&
      u.unlockStatus === "unlocked"
  );
}

function cloneFive(
  viewer: StudioWalletAccount,
  creator: StudioWalletAccount,
  platform: StudioWalletAccount,
  escrow: StudioWalletAccount,
  pool: StudioWalletAccount
): StudioWalletAccount[] {
  return [
    JSON.parse(JSON.stringify(viewer)),
    JSON.parse(JSON.stringify(creator)),
    JSON.parse(JSON.stringify(platform)),
    JSON.parse(JSON.stringify(escrow)),
    JSON.parse(JSON.stringify(pool)),
  ];
}

export function simulateRevealUnlock(input: SimulateRevealUnlockInput): SimulateRevealUnlockResult {
  const {
    reveal,
    viewerAccount,
    creatorAccount,
    platformAccount,
    escrowAccount,
    rewardPoolAccount,
    post,
    amountOverride,
    now,
    existingUnlocks,
    forPreview,
  } = input;

  const unlockAction = revealToUnlockAction(reveal);
  const coin: StudioCoin = reveal.pricing?.coin ?? "iCoin";
  const baseAmount = amountOverride ?? reveal.pricing?.amount ?? 0;

  const emptyUnlock = (status: StudioUnlockStatus, msg: string, elig: StudioEligibilitySnapshot): SimulateRevealUnlockResult => ({
    unlock: {
      id: `ulk_${Date.now()}`,
      revealId: reveal.id,
      projectId: reveal.projectId,
      postId: post.postId,
      viewerAccountId: viewerAccount.id,
      creatorAccountId: creatorAccount.id,
      unlockAction,
      status,
      coin,
      amount: 0,
      creatorGrossAmount: 0,
      platformFeeAmount: 0,
      viewerRewardAmount: 0,
      verificationStatus: "not_required",
      unlockStatus: status,
      ledgerEntryIds: [],
      eligibilityResult: elig,
      settlementStatus: "not_required",
      createdAt: now,
    },
    ledgerEntries: [],
    updatedAccounts: cloneFive(viewerAccount, creatorAccount, platformAccount, escrowAccount, rewardPoolAccount),
    resultMessage: msg,
    success: false,
  });

  if (reveal.revealType === "always_hidden") {
    return emptyUnlock("blocked", "Always hidden — no unlock.", snapEligibility(false, "always_hidden", undefined, "Hidden by creator"));
  }

  if (permanentAlreadyUnlocked(reveal, viewerAccount.id, existingUnlocks)) {
    return emptyUnlock("blocked", "Already unlocked permanently for this viewer.", snapEligibility(false, "already_unlocked", undefined, "No additional charge."));
  }

  const ev = evaluateRevealEligibility({
    reveal,
    viewer: viewerToEligibility(viewerAccount),
    post,
    now,
    forPreview: Boolean(forPreview),
  });
  const eligSnap = snapEligibility(ev.eligible, ev.blockedReason, ev.requiredAction, ev.displayMessage);

  if (!ev.eligible) {
    return emptyUnlock("blocked", ev.displayMessage, eligSnap);
  }

  if (privacyMonetizationBlocked(reveal, unlockAction)) {
    return emptyUnlock(
      "blocked",
      "Privacy-sensitive reveal — monetization not allowed.",
      snapEligibility(false, "privacy_monetization", undefined, "Tip/pay blocked for this safety class.")
    );
  }

  if (reveal.revealType === "pay_to_reveal") {
    const d = (reveal.description ?? "").trim();
    if (d.length < 3) {
      return emptyUnlock("blocked", "Paid reveal requires description (≥3 chars).", snapEligibility(false, "pay_description", "pay", "Add a paid reveal description."));
    }
  }

  const accountsBase = [viewerAccount, creatorAccount, platformAccount, escrowAccount, rewardPoolAccount];

  if (reveal.revealType === "free_tap_reveal") {
    const unlock: StudioRevealUnlock = {
      id: `ulk_${Date.now()}`,
      revealId: reveal.id,
      projectId: reveal.projectId,
      postId: post.postId,
      viewerAccountId: viewerAccount.id,
      creatorAccountId: creatorAccount.id,
      unlockAction: "free",
      status: "unlocked",
      coin,
      amount: 0,
      creatorGrossAmount: 0,
      platformFeeAmount: 0,
      viewerRewardAmount: 0,
      verificationStatus: "not_required",
      unlockStatus: "unlocked",
      ledgerEntryIds: [],
      eligibilityResult: eligSnap,
      settlementStatus: "not_required",
      createdAt: now,
      unlockedAt: now,
    };
    return {
      unlock,
      ledgerEntries: [],
      updatedAccounts: cloneFive(viewerAccount, creatorAccount, platformAccount, escrowAccount, rewardPoolAccount),
      resultMessage: "Free tap reveal unlocked.",
      success: true,
    };
  }

  if (reveal.revealType === "creator_approval_reveal") {
    const unlock: StudioRevealUnlock = {
      id: `ulk_${Date.now()}`,
      revealId: reveal.id,
      projectId: reveal.projectId,
      postId: post.postId,
      viewerAccountId: viewerAccount.id,
      creatorAccountId: creatorAccount.id,
      unlockAction: "request_creator_approval",
      status: "awaiting_confirmation",
      coin,
      amount: 0,
      creatorGrossAmount: 0,
      platformFeeAmount: 0,
      viewerRewardAmount: 0,
      verificationStatus: "pending",
      unlockStatus: "awaiting_confirmation",
      ledgerEntryIds: [],
      eligibilityResult: eligSnap,
      settlementStatus: "not_required",
      createdAt: now,
      metadata: { awaitingCreatorApproval: true },
    };
    return {
      unlock,
      ledgerEntries: [],
      updatedAccounts: cloneFive(viewerAccount, creatorAccount, platformAccount, escrowAccount, rewardPoolAccount),
      resultMessage: "Creator approval requested (mock).",
      success: true,
    };
  }

  if (reveal.revealType === "watch_to_reveal") {
    const settlement = calculateMagicSettlement({ reveal, unlockAction: "watch_ad", amount: 0, coin });
    const vrCoin = (reveal.reward?.viewerRewardCoin ?? "aCoin") as StudioCoin;
    const crCoin = (reveal.reward?.creatorRewardCoin ?? coin) as StudioCoin;
    const unlockId = `ulk_${Date.now()}`;
    const entries: StudioLedgerEntry[] = [];

    if (settlement.viewerRewardAmount > 0) {
      entries.push(
        createLedgerEntry({
          type: "magic_viewer_reward",
          status: "completed",
          coin: vrCoin,
          amount: settlement.viewerRewardAmount,
          fromAccountId: rewardPoolAccount.id,
          toAccountId: viewerAccount.id,
          revealId: reveal.id,
          unlockId,
          projectId: reveal.projectId,
          postId: post.postId,
          description: "Watch reveal — viewer reward (pending verification)",
          metadata: { settleAsPending: true },
        })
      );
    }
    if (settlement.creatorGrossAmount > 0) {
      entries.push(
        createLedgerEntry({
          type: "magic_creator_pending_credit",
          status: "completed",
          coin: crCoin,
          amount: settlement.creatorGrossAmount,
          fromAccountId: rewardPoolAccount.id,
          toAccountId: creatorAccount.id,
          revealId: reveal.id,
          unlockId,
          projectId: reveal.projectId,
          postId: post.postId,
          description: "Watch reveal — creator pending (pool-funded)",
        })
      );
    }

    const unlock: StudioRevealUnlock = {
      id: unlockId,
      revealId: reveal.id,
      projectId: reveal.projectId,
      postId: post.postId,
      viewerAccountId: viewerAccount.id,
      creatorAccountId: creatorAccount.id,
      unlockAction: "watch_ad",
      status: "verifying_action",
      coin,
      amount: 0,
      creatorGrossAmount: settlement.creatorGrossAmount,
      platformFeeAmount: settlement.platformFeeAmount,
      viewerRewardAmount: settlement.viewerRewardAmount,
      verificationStatus: settlement.viewerRewardAmount > 0 ? "pending" : "not_required",
      unlockStatus: "verifying_action",
      ledgerEntryIds: entries.map((e) => e.id),
      eligibilityResult: eligSnap,
      settlementStatus: settlement.creatorGrossAmount > 0 ? "pending" : "not_required",
      createdAt: now,
      metadata: { viewerRewardCoin: vrCoin, watchVerificationPending: true },
    };

    const updated = entries.length
      ? applyLedgerEntries(accountsBase, entries)
      : cloneFive(viewerAccount, creatorAccount, platformAccount, escrowAccount, rewardPoolAccount);
    return {
      unlock,
      ledgerEntries: entries,
      updatedAccounts: updated,
      resultMessage: "Watch-to-reveal: verification pending; rewards staged.",
      success: true,
    };
  }

  if (reveal.revealType === "collective_reveal") {
    const amt = Math.max(0, baseAmount);
    if (amt <= 0) {
      return emptyUnlock("blocked", "Contribution amount required.", eligSnap);
    }
    if (!hasSufficientBalance(viewerAccount, coin, amt)) {
      return emptyUnlock("failed", "Insufficient balance.", eligSnap);
    }

    const goal = reveal.eligibility.revealAfterTotalTips ?? reveal.collectiveProgress?.goal ?? 100;
    const newTips = post.totalTips + amt;
    const thresholdMet = newTips >= goal;

    const unlockId = `ulk_${Date.now()}`;
    const entries: StudioLedgerEntry[] = [
      createLedgerEntry({
        type: "escrow_hold",
        status: "completed",
        coin,
        amount: amt,
        fromAccountId: viewerAccount.id,
        toAccountId: escrowAccount.id,
        revealId: reveal.id,
        unlockId,
        projectId: reveal.projectId,
        postId: post.postId,
        description: "Collective contribution → escrow",
      }),
    ];

    let updated = applyLedgerEntries(accountsBase, entries);
    const minor = reveal.safety.safetyClass === "minor_sensitive";
    let splitOnRelease = { creatorGrossAmount: 0, platformFeeAmount: 0 };

    if (thresholdMet && !minor) {
      const escPending = getBalance(updated.find((a) => a.id === escrowAccount.id)!, coin).pending;
      const releaseAmt = Math.min(escPending, newTips);
      if (releaseAmt > 0) {
        entries.push(
          createLedgerEntry({
            type: "escrow_release",
            status: "completed",
            coin,
            amount: releaseAmt,
            fromAccountId: escrowAccount.id,
            toAccountId: creatorAccount.id,
            revealId: reveal.id,
            unlockId,
            projectId: reveal.projectId,
            postId: post.postId,
            description: "Collective threshold met — escrow → creator pending",
          })
        );
        splitOnRelease = calculateMagicSettlement({ reveal, unlockAction: "collective_contribute", amount: releaseAmt, coin });
        if (splitOnRelease.platformFeeAmount > 0) {
          entries.push(
            createLedgerEntry({
              type: "magic_platform_fee_from_pending",
              status: "completed",
              coin,
              amount: splitOnRelease.platformFeeAmount,
              fromAccountId: creatorAccount.id,
              toAccountId: platformAccount.id,
              revealId: reveal.id,
              unlockId,
              projectId: reveal.projectId,
              postId: post.postId,
              description: "Platform fee (from creator pending)",
            })
          );
        }
        updated = applyLedgerEntries(accountsBase, entries);
      }
    }

    const unlock: StudioRevealUnlock = {
      id: unlockId,
      revealId: reveal.id,
      projectId: reveal.projectId,
      postId: post.postId,
      viewerAccountId: viewerAccount.id,
      creatorAccountId: creatorAccount.id,
      unlockAction: "collective_contribute",
      status: thresholdMet ? "unlocked" : "awaiting_confirmation",
      coin,
      amount: amt,
      creatorGrossAmount: thresholdMet && !minor ? splitOnRelease.creatorGrossAmount : 0,
      platformFeeAmount: thresholdMet && !minor ? splitOnRelease.platformFeeAmount : 0,
      viewerRewardAmount: 0,
      verificationStatus: "not_required",
      unlockStatus: thresholdMet ? "unlocked" : "awaiting_confirmation",
      ledgerEntryIds: entries.map((e) => e.id),
      eligibilityResult: eligSnap,
      settlementStatus: thresholdMet ? "pending" : "pending",
      createdAt: now,
      unlockedAt: thresholdMet ? now : undefined,
      metadata: { collectiveGoal: goal, newTotalTips: newTips },
    };

    return {
      unlock,
      ledgerEntries: entries,
      updatedAccounts: updated,
      updatedPostTips: newTips,
      resultMessage: thresholdMet
        ? minor
          ? "Goal reached — minor-sensitive: no creator revenue (escrow held in demo)."
          : "Collective goal reached — escrow released (demo)."
        : "Contribution recorded in escrow.",
      success: true,
    };
  }

  if (reveal.revealType === "tip_to_reveal" || reveal.revealType === "pay_to_reveal") {
    const amt = Math.max(0, baseAmount);
    if (amt <= 0) {
      return emptyUnlock("blocked", "Amount required.", eligSnap);
    }
    if (!hasSufficientBalance(viewerAccount, coin, amt)) {
      return emptyUnlock("failed", "Insufficient balance.", eligSnap);
    }

    const settlement = calculateMagicSettlement({ reveal, unlockAction, amount: amt, coin });
    const minor = reveal.safety.safetyClass === "minor_sensitive";
    const creatorGross = minor ? 0 : settlement.creatorGrossAmount;
    const platformFee = minor ? 0 : settlement.platformFeeAmount;

    const unlockId = `ulk_${Date.now()}`;
    const entries: StudioLedgerEntry[] = [
      createLedgerEntry({
        type: reveal.revealType === "tip_to_reveal" ? "magic_unlock_tip" : "magic_unlock_payment",
        status: "completed",
        coin,
        amount: amt,
        fromAccountId: viewerAccount.id,
        revealId: reveal.id,
        unlockId,
        projectId: reveal.projectId,
        postId: post.postId,
        description: minor ? "Payment (minor-sensitive: no creator revenue)" : "Viewer payment",
      }),
    ];

    if (creatorGross > 0) {
      entries.push(
        createLedgerEntry({
          type: "magic_creator_pending_credit",
          status: "completed",
          coin,
          amount: creatorGross,
          toAccountId: creatorAccount.id,
          revealId: reveal.id,
          unlockId,
          projectId: reveal.projectId,
          postId: post.postId,
          description: "Creator pending credit",
        })
      );
    }
    if (platformFee > 0) {
      entries.push(
        createLedgerEntry({
          type: "magic_platform_fee",
          status: "completed",
          coin,
          amount: platformFee,
          toAccountId: platformAccount.id,
          revealId: reveal.id,
          unlockId,
          projectId: reveal.projectId,
          postId: post.postId,
          description: "Platform fee",
        })
      );
    }

    const unlock: StudioRevealUnlock = {
      id: unlockId,
      revealId: reveal.id,
      projectId: reveal.projectId,
      postId: post.postId,
      viewerAccountId: viewerAccount.id,
      creatorAccountId: creatorAccount.id,
      unlockAction,
      status: "unlocked",
      coin,
      amount: amt,
      creatorGrossAmount: creatorGross,
      platformFeeAmount: platformFee,
      viewerRewardAmount: settlement.viewerRewardAmount,
      verificationStatus: settlement.viewerRewardAmount > 0 ? "pending" : "not_required",
      unlockStatus: "unlocked",
      ledgerEntryIds: entries.map((e) => e.id),
      eligibilityResult: eligSnap,
      settlementStatus: creatorGross > 0 ? "pending" : "not_required",
      createdAt: now,
      unlockedAt: now,
    };

    const updated = applyLedgerEntries(accountsBase, entries);
    return {
      unlock,
      ledgerEntries: entries,
      updatedAccounts: updated,
      resultMessage: minor ? "Payment recorded — creator revenue suppressed (minor-sensitive)." : "Unlock completed — creator pending credited.",
      success: true,
    };
  }

  const nonMonetary: MagicReveal["revealType"][] = [
    "age_to_reveal",
    "trust_to_reveal",
    "follow_to_reveal",
    "subscribe_to_reveal",
    "location_to_reveal",
    "time_to_reveal",
  ];
  if (nonMonetary.includes(reveal.revealType)) {
    const unlock: StudioRevealUnlock = {
      id: `ulk_${Date.now()}`,
      revealId: reveal.id,
      projectId: reveal.projectId,
      postId: post.postId,
      viewerAccountId: viewerAccount.id,
      creatorAccountId: creatorAccount.id,
      unlockAction,
      status: "unlocked",
      coin,
      amount: 0,
      creatorGrossAmount: 0,
      platformFeeAmount: 0,
      viewerRewardAmount: 0,
      verificationStatus: "not_required",
      unlockStatus: "unlocked",
      ledgerEntryIds: [],
      eligibilityResult: eligSnap,
      settlementStatus: "not_required",
      createdAt: now,
      unlockedAt: now,
    };
    return {
      unlock,
      ledgerEntries: [],
      updatedAccounts: cloneFive(viewerAccount, creatorAccount, platformAccount, escrowAccount, rewardPoolAccount),
      resultMessage: "Gate passed — unlocked (local simulation).",
      success: true,
    };
  }

  return emptyUnlock("blocked", "Reveal type not simulated for settlement in this build.", eligSnap);
}

export function mockVerifyUnlock(input: {
  unlock: StudioRevealUnlock;
  accounts: StudioWalletAccount[];
  now: string;
}): { unlock: StudioRevealUnlock; accounts: StudioWalletAccount[]; newEntries: StudioLedgerEntry[] } {
  const { unlock, accounts, now } = input;
  if (unlock.verificationStatus === "verified") {
    return { unlock, accounts, newEntries: [] };
  }

  const newEntries: StudioLedgerEntry[] = [];
  if (unlock.unlockAction === "watch_ad" && unlock.viewerRewardAmount > 0) {
    const vrCoin = (unlock.metadata?.viewerRewardCoin as StudioCoin | undefined) ?? "aCoin";
    newEntries.push(
      createLedgerEntry({
        type: "magic_pending_release",
        status: "completed",
        coin: vrCoin,
        amount: unlock.viewerRewardAmount,
        toAccountId: unlock.viewerAccountId,
        revealId: unlock.revealId,
        unlockId: unlock.id,
        projectId: unlock.projectId,
        postId: unlock.postId,
        description: "Verification complete — viewer reward pending → available",
        createdAt: now,
      })
    );
  }

  const next = newEntries.length ? applyLedgerEntries(accounts, newEntries) : accounts;
  const u: StudioRevealUnlock = {
    ...unlock,
    verificationStatus: "verified" as VerificationStatus,
    status: "unlocked",
    unlockStatus: "unlocked",
    unlockedAt: unlock.unlockedAt ?? now,
  };
  return { unlock: u, accounts: next, newEntries };
}

export function mockReleaseSettlement(input: {
  unlock: StudioRevealUnlock;
  accounts: StudioWalletAccount[];
  creatorAccountId: string;
  coin: StudioCoin;
  now: string;
}): { unlock: StudioRevealUnlock; accounts: StudioWalletAccount[]; newEntries: StudioLedgerEntry[] } {
  const { unlock, accounts, creatorAccountId, coin, now } = input;
  if (unlock.creatorGrossAmount <= 0) {
    return {
      unlock: { ...unlock, settlementStatus: "released" as SettlementStatus },
      accounts,
      newEntries: [],
    };
  }
  const e = createLedgerEntry({
    type: "magic_settlement_release",
    status: "completed",
    coin,
    amount: unlock.creatorGrossAmount,
    fromAccountId: creatorAccountId,
    toAccountId: creatorAccountId,
    revealId: unlock.revealId,
    unlockId: unlock.id,
    description: "Release creator pending → available",
    createdAt: now,
  });
  const next = applyLedgerEntries(accounts, [e]);
  return {
    unlock: { ...unlock, settlementStatus: "released" as SettlementStatus },
    accounts: next,
    newEntries: [e],
  };
}

export function canRefundUnlock(unlock: StudioRevealUnlock): boolean {
  if (unlock.status === "refunded" || unlock.unlockStatus === "refunded") return false;
  if (unlock.settlementStatus === "released") return false;
  if (unlock.amount <= 0 && unlock.creatorGrossAmount <= 0 && unlock.platformFeeAmount <= 0) return false;
  return true;
}

export function mockRefundUnlock(input: {
  unlock: StudioRevealUnlock;
  accounts: StudioWalletAccount[];
  viewerAccountId: string;
  creatorAccountId: string;
  platformAccountId: string;
  coin: StudioCoin;
  now: string;
}): { unlock: StudioRevealUnlock; accounts: StudioWalletAccount[]; newEntries: StudioLedgerEntry[] } {
  const { unlock, accounts, viewerAccountId, creatorAccountId, platformAccountId, coin, now } = input;
  if (!canRefundUnlock(unlock)) {
    return { unlock, accounts, newEntries: [] };
  }

  const finalEntries: StudioLedgerEntry[] = [];
  if (unlock.amount > 0) {
    finalEntries.push(
      createLedgerEntry({
        type: "magic_refund",
        status: "completed",
        coin,
        amount: unlock.amount,
        toAccountId: viewerAccountId,
        revealId: unlock.revealId,
        unlockId: unlock.id,
        description: "Refund viewer (one-sided credit, demo)",
        createdAt: now,
      })
    );
  }
  if (unlock.creatorGrossAmount > 0) {
    finalEntries.push(
      createLedgerEntry({
        type: "magic_creator_pending_debit",
        status: "completed",
        coin,
        amount: unlock.creatorGrossAmount,
        fromAccountId: creatorAccountId,
        revealId: unlock.revealId,
        unlockId: unlock.id,
        description: "Reverse creator pending",
        createdAt: now,
      })
    );
  }
  if (unlock.platformFeeAmount > 0) {
    finalEntries.push(
      createLedgerEntry({
        type: "magic_settlement_reversal",
        status: "completed",
        coin,
        amount: unlock.platformFeeAmount,
        fromAccountId: platformAccountId,
        revealId: unlock.revealId,
        unlockId: unlock.id,
        description: "Claw back platform fee from available",
        createdAt: now,
      })
    );
  }

  const next = applyLedgerEntries(accounts, finalEntries);

  return {
    unlock: {
      ...unlock,
      status: "refunded",
      unlockStatus: "refunded",
      settlementStatus: "refunded",
    },
    accounts: next,
    newEntries: finalEntries,
  };
}
