import {
  SETTLEMENT_CURRENCY_V1,
  type SettlementCurrency
} from "./settlement-amount.constants.js";
import type { WalletCreditStore } from "./wallet-credit-store.js";

export interface WalletBalanceSnapshot {
  walletOwnerRef: string;
  currency: SettlementCurrency;
  availableMinor: number;
  creditCount: number;
}

export function computeWalletAvailableBalance(
  walletOwnerRef: string,
  store: WalletCreditStore,
  currency: SettlementCurrency = SETTLEMENT_CURRENCY_V1
): WalletBalanceSnapshot {
  const credits = store.listByOwnerRef(walletOwnerRef).filter((credit) => credit.currency === currency);

  return {
    walletOwnerRef,
    currency,
    availableMinor: credits.reduce((sum, credit) => sum + credit.amount, 0),
    creditCount: credits.length
  };
}
