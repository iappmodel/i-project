export type StartAttentionSessionResponseDto = {
  attentionSessionId: string;
};

export type CompleteAttentionSessionResponseDto = {
  attentionEventId: string;
  rewardStatus: "queued";
};

export type AttentionHistoryItemDto = {
  attentionEventId: string;
  attentionSessionId: string;

  userId: string;
  walletId: string;

  campaignId: string | null;
  creativeId: string | null;
  placementId: string | null;

  userVisibleResult:
    | "verified"
    | "not_verified"
    | "not_accepted"
    | "try_again"
    | "unknown";

  rewardEligible: boolean;
  rewardIssued: boolean;
  rewardId: string | null;

  occurredAt: string;
  createdAt: string;
};

export type AttentionHistoryResponseDto = {
  items: AttentionHistoryItemDto[];
  nextCursor: string | null;
};
