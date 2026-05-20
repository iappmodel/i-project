export type RewardHistoryItemDto = {
  rewardId: string;
  attentionEventId: string;

  userId: string;
  walletId: string;

  campaignId: string | null;
  creativeId: string | null;
  placementId: string | null;

  currencyCode: "USD";
  rewardAmountMinor: number;

  status: string;
  displayStatus: string;

  queuedAt: string;
  completedAt: string | null;
  failedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type RewardHistoryResponseDto = {
  items: RewardHistoryItemDto[];
  nextCursor: string | null;
};
