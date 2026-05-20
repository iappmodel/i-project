export type WalletSummaryDto = {
  walletId: string;
  userId: string;
  currencyCode: "USD";

  availableBalanceMinor: number;
  pendingBalanceMinor: number;
  lockedBalanceMinor: number;
  totalBalanceMinor: number;

  status: "active" | "restricted" | "locked" | "fraud_locked" | "closed";

  createdAt: string;
  updatedAt: string;
};

export type WalletLedgerEntryDto = {
  walletLedgerEntryId: string;
  walletId: string;
  userId: string;

  currencyCode: "USD";
  entryType: string;

  availableImpactMinor: number;
  pendingImpactMinor: number;
  lockedImpactMinor: number;

  status: string;
  displayLabel: string;

  createdAt: string;
};

export type WalletLedgerResponseDto = {
  items: WalletLedgerEntryDto[];
  nextCursor: string | null;
};
