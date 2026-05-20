import type { MagicReveal } from "../studioTypes";
import type { MagicSettlementBreakdown, StudioCoin, StudioUnlockAction } from "./studioWalletTypes";

export type CalculateMagicSettlementInput = {
  reveal: MagicReveal;
  unlockAction: StudioUnlockAction;
  amount: number;
  coin: StudioCoin;
};

export function calculateMagicSettlement(input: CalculateMagicSettlementInput): MagicSettlementBreakdown {
  const { reveal, unlockAction, amount, coin: _coin } = input;
  const s = reveal.settlement ?? {
    creatorShareBps: 9000,
    platformFeeBps: 1000,
    viewerRewardBps: 0,
    pendingHoldSeconds: 86_400,
  };
  const creatorShareBps = s.creatorShareBps ?? 9000;
  const platformFeeBps = s.platformFeeBps ?? 1000;
  const viewerRewardBps = s.viewerRewardBps ?? 0;
  const pendingHoldSeconds = s.pendingHoldSeconds ?? 86_400;

  const zero: MagicSettlementBreakdown = {
    creatorGrossAmount: 0,
    platformFeeAmount: 0,
    viewerRewardAmount: 0,
    creatorShareBps,
    platformFeeBps,
    viewerRewardBps,
    pendingHoldSeconds,
  };

  if (reveal.revealType === "always_hidden" || unlockAction === "wait") {
    return zero;
  }

  if (reveal.revealType === "free_tap_reveal" || unlockAction === "free") {
    return zero;
  }

  if (reveal.safety.safetyClass === "minor_sensitive") {
    return { ...zero, creatorGrossAmount: 0, platformFeeAmount: 0, viewerRewardAmount: 0 };
  }

  if (reveal.revealType === "watch_to_reveal" || unlockAction === "watch_ad") {
    const viewerRewardAmount = reveal.reward?.viewerRewardEnabled ? (reveal.reward.viewerRewardAmount ?? 0) : 0;
    const creatorGross =
      reveal.reward?.creatorRewardEnabled && reveal.reward.creatorRewardAmount != null
        ? reveal.reward.creatorRewardAmount
        : 0;
    return {
      creatorGrossAmount: creatorGross,
      platformFeeAmount: 0,
      viewerRewardAmount,
      creatorShareBps,
      platformFeeBps: 0,
      viewerRewardBps: viewerRewardBps,
      pendingHoldSeconds,
    };
  }

  if (unlockAction === "collective_contribute" || reveal.revealType === "collective_reveal") {
    const gross = Math.max(0, amount);
    return {
      creatorGrossAmount: (gross * creatorShareBps) / 10_000,
      platformFeeAmount: (gross * platformFeeBps) / 10_000,
      viewerRewardAmount: (gross * viewerRewardBps) / 10_000,
      creatorShareBps,
      platformFeeBps,
      viewerRewardBps,
      pendingHoldSeconds,
    };
  }

  if (unlockAction === "tip" || unlockAction === "pay" || reveal.revealType === "tip_to_reveal" || reveal.revealType === "pay_to_reveal") {
    const gross = Math.max(0, amount);
    return {
      creatorGrossAmount: (gross * creatorShareBps) / 10_000,
      platformFeeAmount: (gross * platformFeeBps) / 10_000,
      viewerRewardAmount: (gross * viewerRewardBps) / 10_000,
      creatorShareBps,
      platformFeeBps,
      viewerRewardBps,
      pendingHoldSeconds,
    };
  }

  return zero;
}
