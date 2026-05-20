export type WithdrawalStatus =
  | "requested"
  | "trust_review"
  | "approved"
  | "reserved"
  | "submitted"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

export type CreateWithdrawalResponseDto = {
  withdrawalRequestId: string;
  status: WithdrawalStatus;
};

export type WithdrawalSummaryDto = {
  withdrawalRequestId: string;
  userId: string;
  walletId: string;

  currencyCode: "USD";

  requestedAmountMinor: number;
  processorFeeMinor: number;
  netAmountMinor: number;

  status: WithdrawalStatus;

  requestedAt: string;
  approvedAt: string | null;
  reservedAt: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;

  visibleStatusReason: string | null;

  createdAt: string;
  updatedAt: string;
};

export type WithdrawalHistoryResponseDto = {
  items: WithdrawalSummaryDto[];
  nextCursor: string | null;
};
