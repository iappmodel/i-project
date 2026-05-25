import {
  LEDGER_BOUNDARY_V1,
  type LedgerEntry
} from "./ledger-entry.js";
import type { SettlementCurrency } from "./settlement-amount.constants.js";
import type { SettlementAmountBreakdown } from "./settlement-amount.types.js";
import type { WalletOwnerIdentity } from "./wallet-owner-resolver.js";

export const WALLET_BOUNDARY_V1 = "WALLET_BOUNDARY_V1" as const;

export type WalletBoundaryVersion = typeof WALLET_BOUNDARY_V1;

export type WalletOwnerResolutionSource = WalletOwnerIdentity["resolutionSource"];

export interface WalletCreditRecord {
  boundaryVersion: WalletBoundaryVersion;
  sourceBoundaryVersion: typeof LEDGER_BOUNDARY_V1;
  walletCreditId: string;
  sourceRef: string;
  ledgerEntryId: string;
  sessionId: string;
  offerId: string;
  walletOwnerRef: string;
  userId: string | null;
  localUserRef: string;
  ownerResolutionSource: WalletOwnerResolutionSource;
  amount: number;
  currency: SettlementCurrency;
  amountBreakdown: SettlementAmountBreakdown;
  creditedAt: string;
}

export interface BuildWalletCreditFromLedgerEntryOptions {
  creditedAt?: string;
}

export function deriveWalletCreditId(sourceRef: string): string {
  return `wallet_credit_${sourceRef}`;
}

export function buildWalletCreditFromLedgerEntry(
  ledger: LedgerEntry,
  owner: WalletOwnerIdentity,
  options?: BuildWalletCreditFromLedgerEntryOptions
): WalletCreditRecord {
  if (ledger.boundaryVersion !== LEDGER_BOUNDARY_V1) {
    throw new Error(
      `buildWalletCreditFromLedgerEntry requires boundaryVersion ${LEDGER_BOUNDARY_V1}`
    );
  }

  if (ledger.status !== "pending_wallet_credit") {
    throw new Error(
      'buildWalletCreditFromLedgerEntry requires status "pending_wallet_credit"'
    );
  }

  if (ledger.direction !== "credit") {
    throw new Error('buildWalletCreditFromLedgerEntry requires direction "credit"');
  }

  if (!ledger.sourceRef || ledger.sourceRef.trim().length === 0) {
    throw new Error("buildWalletCreditFromLedgerEntry requires a non-empty sourceRef");
  }

  if (ledger.amount < 1) {
    throw new Error("buildWalletCreditFromLedgerEntry requires amount >= 1");
  }

  if (!owner.walletOwnerRef || owner.walletOwnerRef.trim().length === 0) {
    throw new Error("buildWalletCreditFromLedgerEntry requires a non-empty walletOwnerRef");
  }

  const creditedAt = options?.creditedAt ?? ledger.postedAt;

  return {
    boundaryVersion: WALLET_BOUNDARY_V1,
    sourceBoundaryVersion: LEDGER_BOUNDARY_V1,
    walletCreditId: deriveWalletCreditId(ledger.sourceRef),
    sourceRef: ledger.sourceRef,
    ledgerEntryId: ledger.ledgerEntryId,
    sessionId: ledger.sessionId,
    offerId: ledger.offerId,
    walletOwnerRef: owner.walletOwnerRef,
    userId: owner.userId,
    localUserRef: owner.localUserRef,
    ownerResolutionSource: owner.resolutionSource,
    amount: ledger.amount,
    currency: ledger.currency,
    amountBreakdown: { ...ledger.amountBreakdown },
    creditedAt
  };
}
