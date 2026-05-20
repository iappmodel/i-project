import { toNumber, toStringValue } from "../../shared/map";
import type { WalletLedgerEntryDto, WalletSummaryDto } from "./wallet.dto";

export function mapWalletSummaryRow(row: any): WalletSummaryDto | null {
  if (!row) return null;

  return {
    walletId: toStringValue(row.wallet_id),
    userId: toStringValue(row.user_id),
    currencyCode: row.currency_code,

    availableBalanceMinor: toNumber(row.available_balance_minor),
    pendingBalanceMinor: toNumber(row.pending_balance_minor),
    lockedBalanceMinor: toNumber(row.locked_balance_minor),
    totalBalanceMinor: toNumber(row.total_balance_minor),

    status: row.status,

    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at)
  };
}

export function mapWalletLedgerRow(row: any): WalletLedgerEntryDto {
  return {
    walletLedgerEntryId: toStringValue(row.wallet_ledger_entry_id),
    walletId: toStringValue(row.wallet_id),
    userId: toStringValue(row.user_id),

    currencyCode: row.currency_code,
    entryType: toStringValue(row.entry_type),

    availableImpactMinor: toNumber(row.available_impact_minor),
    pendingImpactMinor: toNumber(row.pending_impact_minor),
    lockedImpactMinor: toNumber(row.locked_impact_minor),

    status: toStringValue(row.status),
    displayLabel: toStringValue(row.display_label),

    createdAt: toStringValue(row.created_at)
  };
}
