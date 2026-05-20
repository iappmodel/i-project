export type UserHomeSnapshotDto = {
  userId: string;
  walletId: string;

  currencyCode: "USD";

  availableBalanceMinor: number;
  pendingBalanceMinor: number;
  lockedBalanceMinor: number;
  totalBalanceMinor: number;

  walletStatus: string;

  completedRewardCount: number;
  completedRewardAmountMinor: number;

  attentionEventCount24h: number;
  rewardEligibleAttentionCount24h: number;

  walletUpdatedAt: string;
};
