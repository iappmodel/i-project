import type { CoinBalanceState, CoinCode } from "../../types/alphabet/coin.types";
import type { ConversionExecutionResult } from "../../types/alphabet/conversion-engine.types";
import type { CoinConversion } from "../../types/alphabet/conversion.types";
import type { RewardIssuanceResult } from "../../types/alphabet/reward.types";
import type { CoinAccount, CoinLot, LedgerEntry, Wallet } from "../../types/alphabet/wallet.types";
import { canCoinSpend } from "./coin-utils";

type WalletStoreState = {
  wallets: Map<string, Wallet>;
  walletsByUserId: Map<string, string>;
  coinAccounts: Map<string, CoinAccount>;
  coinLots: Map<string, CoinLot>;
  ledgerEntries: LedgerEntry[];
  conversions: CoinConversion[];
};

export type WalletSummaryCoin = {
  coinCode: CoinCode;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  restrictedBalance: number;
  identityBalance: number;
  scoreValue: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
};

export type WalletSummary = {
  wallet: Wallet;
  coins: WalletSummaryCoin[];
  totals: {
    availableSpendableValue: number;
    pendingValue: number;
    lockedValue: number;
    totalIdentityValue: number;
    totalScoreValue: number;
  };
};

const store: WalletStoreState = {
  wallets: new Map(),
  walletsByUserId: new Map(),
  coinAccounts: new Map(),
  coinLots: new Map(),
  ledgerEntries: [],
  conversions: []
};

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getCoinAccountKey(walletId: string, coinCode: CoinCode): string {
  return `${walletId}:${coinCode}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}

function getBalanceFieldForState(
  state: CoinBalanceState
):
  | "availableBalance"
  | "pendingBalance"
  | "lockedBalance"
  | "restrictedBalance"
  | "identityBalance"
  | "scoreValue"
  | null {
  switch (state) {
    case "available":
    case "settled":
      return "availableBalance";
    case "pending":
      return "pendingBalance";
    case "locked":
      return "lockedBalance";
    case "restricted":
      return "restrictedBalance";
    case "identity":
      return "identityBalance";
    case "score":
      return "scoreValue";
    case "expired":
    case "revoked":
    case "converted":
      return null;
    default:
      return assertNever(state);
  }
}

function addToAccountState(
  account: CoinAccount,
  state: CoinBalanceState,
  amount: number
): CoinAccount {
  const field = getBalanceFieldForState(state);
  if (!field) return account;

  return {
    ...account,
    [field]: Number((account[field] + amount).toFixed(6)),
    lifetimeEarned:
      state === "pending" ||
      state === "available" ||
      state === "settled" ||
      state === "restricted" ||
      state === "identity" ||
      state === "score"
        ? Number((account.lifetimeEarned + amount).toFixed(6))
        : account.lifetimeEarned,
    updatedAt: nowIso()
  };
}

function subtractFromAccountState(
  account: CoinAccount,
  state: CoinBalanceState,
  amount: number
): CoinAccount {
  const field = getBalanceFieldForState(state);
  if (!field) return account;

  const nextValue = Math.max(0, account[field] - amount);

  return {
    ...account,
    [field]: Number(nextValue.toFixed(6)),
    updatedAt: nowIso()
  };
}

export function createWallet(userId: string): Wallet {
  const existingWalletId = store.walletsByUserId.get(userId);
  if (existingWalletId) {
    const existingWallet = store.wallets.get(existingWalletId);
    if (!existingWallet) throw new Error("Wallet index corrupted.");
    return existingWallet;
  }

  const wallet: Wallet = {
    walletId: createId("wallet"),
    userId,
    walletStatus: "active",
    defaultCurrency: "iCoin",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.wallets.set(wallet.walletId, wallet);
  store.walletsByUserId.set(userId, wallet.walletId);
  return wallet;
}

export function getWallet(userId: string): Wallet | null {
  const walletId = store.walletsByUserId.get(userId);
  if (!walletId) return null;
  return store.wallets.get(walletId) ?? null;
}

export function getWalletById(walletId: string): Wallet | null {
  return store.wallets.get(walletId) ?? null;
}

export function getOrCreateCoinAccount(walletId: string, coinCode: CoinCode): CoinAccount {
  const key = getCoinAccountKey(walletId, coinCode);
  const existing = store.coinAccounts.get(key);
  if (existing) return existing;

  const account: CoinAccount = {
    coinAccountId: createId("coin_account"),
    walletId,
    coinCode,
    availableBalance: 0,
    pendingBalance: 0,
    lockedBalance: 0,
    restrictedBalance: 0,
    identityBalance: 0,
    scoreValue: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    lifetimeConvertedIn: 0,
    lifetimeConvertedOut: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.coinAccounts.set(key, account);
  return account;
}

export function applyCoinLot(coinLot: CoinLot): CoinLot {
  const wallet = store.wallets.get(coinLot.walletId);
  if (!wallet) {
    throw new Error(`Cannot apply coin lot. Wallet not found: ${coinLot.walletId}`);
  }

  const existingLot = store.coinLots.get(coinLot.lotId);
  if (existingLot) throw new Error(`Coin lot already exists: ${coinLot.lotId}`);

  const account = getOrCreateCoinAccount(coinLot.walletId, coinLot.coinCode);
  const updatedAccount = addToAccountState(account, coinLot.state, coinLot.amountRemaining);

  store.coinAccounts.set(getCoinAccountKey(coinLot.walletId, coinLot.coinCode), updatedAccount);
  store.coinLots.set(coinLot.lotId, coinLot);
  return coinLot;
}

export function applyLedgerEntry(ledgerEntry: LedgerEntry): LedgerEntry {
  const wallet = store.wallets.get(ledgerEntry.walletId);
  if (!wallet) {
    throw new Error(`Cannot apply ledger entry. Wallet not found: ${ledgerEntry.walletId}`);
  }

  store.ledgerEntries.push(ledgerEntry);
  return ledgerEntry;
}

function applyScoreLedgerEntry(ledgerEntry: LedgerEntry): void {
  if (ledgerEntry.stateAfter !== "score") return;

  const account = getOrCreateCoinAccount(ledgerEntry.walletId, ledgerEntry.coinCode);
  const updatedAccount: CoinAccount = {
    ...account,
    scoreValue: Number((account.scoreValue + ledgerEntry.amount).toFixed(6)),
    lifetimeEarned: Number((account.lifetimeEarned + ledgerEntry.amount).toFixed(6)),
    updatedAt: nowIso()
  };

  store.coinAccounts.set(
    getCoinAccountKey(ledgerEntry.walletId, ledgerEntry.coinCode),
    updatedAccount
  );
}

function applyIdentityLedgerEntry(ledgerEntry: LedgerEntry): void {
  if (ledgerEntry.stateAfter !== "identity") return;

  const account = getOrCreateCoinAccount(ledgerEntry.walletId, ledgerEntry.coinCode);
  const updatedAccount: CoinAccount = {
    ...account,
    identityBalance: Number((account.identityBalance + ledgerEntry.amount).toFixed(6)),
    lifetimeEarned: Number((account.lifetimeEarned + ledgerEntry.amount).toFixed(6)),
    updatedAt: nowIso()
  };

  store.coinAccounts.set(
    getCoinAccountKey(ledgerEntry.walletId, ledgerEntry.coinCode),
    updatedAccount
  );
}

export function applyRewardIssuanceResult(result: RewardIssuanceResult): RewardIssuanceResult {
  if (!result.issued) return result;
  if (result.coinLot) {
    applyCoinLot(result.coinLot);
  }

  if (result.ledgerEntry) {
    if (result.ledgerEntry.stateAfter === "score") {
      applyScoreLedgerEntry(result.ledgerEntry);
    }

    if (result.ledgerEntry.stateAfter === "identity") {
      applyIdentityLedgerEntry(result.ledgerEntry);
    }

    applyLedgerEntry(result.ledgerEntry);
  }

  return result;
}

export function debitAvailableBalance(
  walletId: string,
  coinCode: CoinCode,
  amount: number
): CoinAccount {
  if (amount <= 0) {
    throw new Error("Debit amount must be greater than zero.");
  }

  const account = getOrCreateCoinAccount(walletId, coinCode);
  if (account.availableBalance < amount) {
    throw new Error(
      `Insufficient available balance for ${coinCode}. Required ${amount}, available ${account.availableBalance}.`
    );
  }

  const updatedAccount: CoinAccount = {
    ...account,
    availableBalance: Number((account.availableBalance - amount).toFixed(6)),
    lifetimeConvertedOut: Number((account.lifetimeConvertedOut + amount).toFixed(6)),
    updatedAt: nowIso()
  };

  store.coinAccounts.set(getCoinAccountKey(walletId, coinCode), updatedAccount);
  return updatedAccount;
}

export function incrementConvertedInBalance(
  walletId: string,
  coinCode: CoinCode,
  amount: number
): CoinAccount {
  const account = getOrCreateCoinAccount(walletId, coinCode);

  const updatedAccount: CoinAccount = {
    ...account,
    lifetimeConvertedIn: Number((account.lifetimeConvertedIn + amount).toFixed(6)),
    updatedAt: nowIso()
  };

  store.coinAccounts.set(getCoinAccountKey(walletId, coinCode), updatedAccount);
  return updatedAccount;
}

export function applyTargetConversionLot(targetCoinLot: CoinLot): CoinLot {
  return applyCoinLot(targetCoinLot);
}

export function applyConversionExecutionResult(
  result: ConversionExecutionResult
): ConversionExecutionResult {
  if (!result.converted) return result;

  if (
    !result.conversion ||
    !result.sourceDebitLedgerEntry ||
    !result.targetCoinLot ||
    !result.targetCreditLedgerEntry
  ) {
    throw new Error("Converted result is missing required conversion artifacts.");
  }

  debitAvailableBalance(
    result.sourceDebitLedgerEntry.walletId,
    result.conversion.sourceCoin,
    result.conversion.sourceAmount
  );

  applyLedgerEntry(result.sourceDebitLedgerEntry);
  applyCoinLot(result.targetCoinLot);
  incrementConvertedInBalance(
    result.targetCreditLedgerEntry.walletId,
    result.conversion.targetCoin,
    result.conversion.targetAmount
  );
  applyLedgerEntry(result.targetCreditLedgerEntry);

  store.conversions.push(result.conversion);
  return result;
}

export function applyConversionToWallet(params: {
  walletId: string;
  userId: string;
  conversionQuoteId: string;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  targetAmount: number;
  conversionFeeAmount: number;
}): void {
  const sourceAccount = getOrCreateCoinAccount(params.walletId, params.sourceCoin);
  const targetAccount = getOrCreateCoinAccount(params.walletId, params.targetCoin);

  if (sourceAccount.availableBalance < params.sourceAmount) {
    throw new Error("Insufficient available source balance for conversion.");
  }

  const now = nowIso();

  const updatedSource: CoinAccount = {
    ...sourceAccount,
    availableBalance: Number(
      (sourceAccount.availableBalance - params.sourceAmount).toFixed(6)
    ),
    updatedAt: now
  };

  const updatedTarget: CoinAccount = {
    ...targetAccount,
    availableBalance: Number(
      (targetAccount.availableBalance + params.targetAmount).toFixed(6)
    ),
    lifetimeEarned: Number(
      (targetAccount.lifetimeEarned + params.targetAmount).toFixed(6)
    ),
    updatedAt: now
  };

  store.coinAccounts.set(
    getCoinAccountKey(params.walletId, params.sourceCoin),
    updatedSource
  );

  store.coinAccounts.set(
    getCoinAccountKey(params.walletId, params.targetCoin),
    updatedTarget
  );

  applyLedgerEntry({
    entryId: `ledger_${crypto.randomUUID()}`,
    walletId: params.walletId,
    coinCode: params.sourceCoin,
    amount: -params.sourceAmount,
    direction: "conversion_debit",
    stateBefore: "available",
    stateAfter: "available",
    eventType: "conversion_debit",
    sourceEventId: params.conversionQuoteId,
    metadata: {
      conversionQuoteId: params.conversionQuoteId,
      targetCoin: params.targetCoin
    },
    createdAt: now
  });

  applyLedgerEntry({
    entryId: `ledger_${crypto.randomUUID()}`,
    walletId: params.walletId,
    coinCode: params.targetCoin,
    amount: params.targetAmount,
    direction: "conversion_credit",
    stateBefore: "available",
    stateAfter: "available",
    eventType: "conversion_credit",
    sourceEventId: params.conversionQuoteId,
    metadata: {
      conversionQuoteId: params.conversionQuoteId,
      sourceCoin: params.sourceCoin
    },
    createdAt: now
  });

  if (params.conversionFeeAmount > 0) {
    applyLedgerEntry({
      entryId: `ledger_${crypto.randomUUID()}`,
      walletId: params.walletId,
      coinCode: params.targetCoin,
      amount: params.conversionFeeAmount,
      direction: "conversion_fee",
      stateBefore: "available",
      stateAfter: "available",
      eventType: "conversion_fee",
      sourceEventId: params.conversionQuoteId,
      metadata: {
        conversionQuoteId: params.conversionQuoteId,
        sourceCoin: params.sourceCoin,
        targetCoin: params.targetCoin
      },
      createdAt: now
    });
  }
}

export function applyWithdrawalDebitToWallet(params: {
  walletId: string;
  userId: string;
  withdrawalRequestId: string;
  coinCode: CoinCode;
  requestedAmount: number;
  payoutAmount: number;
  feeAmount: number;
}): void {
  const account = getOrCreateCoinAccount(params.walletId, params.coinCode);
  if (account.availableBalance < params.requestedAmount) {
    throw new Error("Insufficient available balance for withdrawal.");
  }

  const now = nowIso();
  const updatedAccount: CoinAccount = {
    ...account,
    availableBalance: Number((account.availableBalance - params.requestedAmount).toFixed(6)),
    lifetimeSpent: Number((account.lifetimeSpent + params.requestedAmount).toFixed(6)),
    updatedAt: now
  };

  store.coinAccounts.set(getCoinAccountKey(params.walletId, params.coinCode), updatedAccount);

  applyLedgerEntry({
    entryId: `ledger_${crypto.randomUUID()}`,
    walletId: params.walletId,
    coinCode: params.coinCode,
    amount: -params.requestedAmount,
    direction: "withdrawal_debit",
    stateBefore: "available",
    stateAfter: "converted",
    eventType: "withdrawal_debit",
    sourceEventId: params.withdrawalRequestId,
    metadata: {
      withdrawalRequestId: params.withdrawalRequestId,
      userId: params.userId,
      payoutAmount: params.payoutAmount,
      feeAmount: params.feeAmount
    },
    createdAt: now
  });

  if (params.feeAmount > 0) {
    applyLedgerEntry({
      entryId: `ledger_${crypto.randomUUID()}`,
      walletId: params.walletId,
      coinCode: params.coinCode,
      amount: -params.feeAmount,
      direction: "withdrawal_fee",
      stateBefore: "available",
      stateAfter: "converted",
      eventType: "withdrawal_fee",
      sourceEventId: params.withdrawalRequestId,
      metadata: {
        withdrawalRequestId: params.withdrawalRequestId,
        userId: params.userId
      },
      createdAt: now
    });
  }

  applyLedgerEntry({
    entryId: `ledger_${crypto.randomUUID()}`,
    walletId: params.walletId,
    coinCode: params.coinCode,
    amount: params.payoutAmount,
    direction: "payout_completed",
    stateBefore: "converted",
    stateAfter: "converted",
    eventType: "payout_completed",
    sourceEventId: params.withdrawalRequestId,
    metadata: {
      withdrawalRequestId: params.withdrawalRequestId,
      userId: params.userId
    },
    createdAt: now
  });
}

export function applyCreatorPayoutCreditToWallet(params: {
  walletId: string;
  userId: string;
  creatorPayoutId: string;
  coinCode: CoinCode;
  amount: number;
  platformFeeAmount: number;
  taxWithholdingEstimate: number;
}): void {
  const account = getOrCreateCoinAccount(params.walletId, params.coinCode);
  const now = nowIso();

  const updatedAccount: CoinAccount = {
    ...account,
    availableBalance: Number(
      (account.availableBalance + params.amount).toFixed(6)
    ),
    lifetimeEarned: Number(
      (account.lifetimeEarned + params.amount).toFixed(6)
    ),
    updatedAt: now
  };

  store.coinAccounts.set(
    getCoinAccountKey(params.walletId, params.coinCode),
    updatedAccount
  );

  applyLedgerEntry({
    entryId: `ledger_${crypto.randomUUID()}`,
    walletId: params.walletId,
    coinCode: params.coinCode,
    amount: params.amount,
    direction: "creator_payout_credit",
    stateBefore: "available",
    stateAfter: "available",
    eventType: "creator_payout_credit",
    sourceEventId: params.creatorPayoutId,
    metadata: {
      creatorPayoutId: params.creatorPayoutId,
      userId: params.userId
    },
    createdAt: now
  });

  if (params.platformFeeAmount > 0) {
    applyLedgerEntry({
      entryId: `ledger_${crypto.randomUUID()}`,
      walletId: params.walletId,
      coinCode: params.coinCode,
      amount: -params.platformFeeAmount,
      direction: "creator_platform_fee",
      stateBefore: "available",
      stateAfter: "available",
      eventType: "creator_platform_fee",
      sourceEventId: params.creatorPayoutId,
      metadata: {
        creatorPayoutId: params.creatorPayoutId,
        userId: params.userId
      },
      createdAt: now
    });
  }

  if (params.taxWithholdingEstimate > 0) {
    applyLedgerEntry({
      entryId: `ledger_${crypto.randomUUID()}`,
      walletId: params.walletId,
      coinCode: params.coinCode,
      amount: -params.taxWithholdingEstimate,
      direction: "creator_tax_withholding",
      stateBefore: "available",
      stateAfter: "available",
      eventType: "creator_tax_withholding",
      sourceEventId: params.creatorPayoutId,
      metadata: {
        creatorPayoutId: params.creatorPayoutId,
        userId: params.userId
      },
      createdAt: now
    });
  }
}

export function applyGrantCreditToWallet(params: {
  walletId: string;
  userId: string;
  grantEligibilityId: string;
  coinCode: CoinCode;
  amount: number;
}): void {
  const account = getOrCreateCoinAccount(params.walletId, params.coinCode);
  const now = nowIso();

  const updatedAccount: CoinAccount = {
    ...account,
    availableBalance: Number((account.availableBalance + params.amount).toFixed(6)),
    lifetimeEarned: Number((account.lifetimeEarned + params.amount).toFixed(6)),
    updatedAt: now
  };

  store.coinAccounts.set(
    getCoinAccountKey(params.walletId, params.coinCode),
    updatedAccount
  );

  applyLedgerEntry({
    entryId: `ledger_${crypto.randomUUID()}`,
    walletId: params.walletId,
    coinCode: params.coinCode,
    amount: params.amount,
    direction: "grant_credit",
    stateBefore: "available",
    stateAfter: "available",
    eventType: "grant_credit",
    sourceEventId: params.grantEligibilityId,
    metadata: {
      grantEligibilityId: params.grantEligibilityId,
      userId: params.userId
    },
    createdAt: now
  });
}

export function getCoinLots(walletId: string): CoinLot[] {
  return Array.from(store.coinLots.values()).filter((lot) => lot.walletId === walletId);
}

export function getLedgerEntries(walletId: string): LedgerEntry[] {
  return store.ledgerEntries.filter((entry) => entry.walletId === walletId);
}

export function getConversionsByUserId(userId: string): CoinConversion[] {
  return store.conversions.filter((conversion) => conversion.userId === userId);
}

export function getConversionsByWalletId(walletId: string): CoinConversion[] {
  const wallet = getWalletById(walletId);
  if (!wallet) return [];
  return getConversionsByUserId(wallet.userId);
}

export function calculateWalletSummary(walletId: string): WalletSummary {
  const wallet = getWalletById(walletId);
  if (!wallet) throw new Error(`Wallet not found: ${walletId}`);

  const accounts = Array.from(store.coinAccounts.values()).filter(
    (account) => account.walletId === walletId
  );

  const coins: WalletSummaryCoin[] = accounts.map((account) => ({
    coinCode: account.coinCode,
    availableBalance: account.availableBalance,
    pendingBalance: account.pendingBalance,
    lockedBalance: account.lockedBalance,
    restrictedBalance: account.restrictedBalance,
    identityBalance: account.identityBalance,
    scoreValue: account.scoreValue,
    lifetimeEarned: account.lifetimeEarned,
    lifetimeSpent: account.lifetimeSpent
  }));

  const totals = coins.reduce(
    (acc, coin) => {
      if (canCoinSpend(coin.coinCode)) {
        acc.availableSpendableValue += coin.availableBalance;
      }
      acc.pendingValue += coin.pendingBalance;
      acc.lockedValue += coin.lockedBalance;
      acc.totalIdentityValue += coin.identityBalance;
      acc.totalScoreValue += coin.scoreValue;
      return acc;
    },
    {
      availableSpendableValue: 0,
      pendingValue: 0,
      lockedValue: 0,
      totalIdentityValue: 0,
      totalScoreValue: 0
    }
  );

  return {
    wallet,
    coins,
    totals: {
      availableSpendableValue: Number(totals.availableSpendableValue.toFixed(6)),
      pendingValue: Number(totals.pendingValue.toFixed(6)),
      lockedValue: Number(totals.lockedValue.toFixed(6)),
      totalIdentityValue: Number(totals.totalIdentityValue.toFixed(6)),
      totalScoreValue: Number(totals.totalScoreValue.toFixed(6))
    }
  };
}

export function releasePendingLots(walletId: string, now: Date = new Date()): CoinLot[] {
  const releasedLots: CoinLot[] = [];

  for (const lot of store.coinLots.values()) {
    if (lot.walletId !== walletId) continue;
    if (lot.state !== "pending") continue;
    if (!lot.availableAt) continue;

    const availableAt = new Date(lot.availableAt);
    if (availableAt > now) continue;

    const account = getOrCreateCoinAccount(lot.walletId, lot.coinCode);
    const afterSubtract = subtractFromAccountState(account, "pending", lot.amountRemaining);
    const afterAdd = addToAccountState(afterSubtract, "available", lot.amountRemaining);
    store.coinAccounts.set(getCoinAccountKey(lot.walletId, lot.coinCode), afterAdd);

    const updatedLot: CoinLot = {
      ...lot,
      state: "available",
      updatedAt: nowIso()
    };
    store.coinLots.set(lot.lotId, updatedLot);

    const ledgerEntry: LedgerEntry = {
      entryId: createId("ledger"),
      walletId: lot.walletId,
      coinCode: lot.coinCode,
      lotId: lot.lotId,
      direction: "unlock",
      amount: lot.amountRemaining,
      stateBefore: "pending",
      stateAfter: "available",
      eventType: "coin_lot_released",
      sourceEventId: lot.sourceEventId,
      counterpartyId: null,
      metadata: { reason: "pending_period_elapsed" },
      createdAt: nowIso()
    };

    applyLedgerEntry(ledgerEntry);
    releasedLots.push(updatedLot);
  }

  return releasedLots;
}

export function lockCoinLot(lotId: string, reason: string): CoinLot {
  const lot = store.coinLots.get(lotId);
  if (!lot) throw new Error(`Coin lot not found: ${lotId}`);
  if (lot.state === "locked") return lot;

  const account = getOrCreateCoinAccount(lot.walletId, lot.coinCode);
  const afterSubtract = subtractFromAccountState(account, lot.state, lot.amountRemaining);
  const afterAdd = addToAccountState(afterSubtract, "locked", lot.amountRemaining);
  store.coinAccounts.set(getCoinAccountKey(lot.walletId, lot.coinCode), afterAdd);

  const updatedLot: CoinLot = {
    ...lot,
    state: "locked",
    riskHoldUntil: null,
    updatedAt: nowIso()
  };
  store.coinLots.set(lotId, updatedLot);

  applyLedgerEntry({
    entryId: createId("ledger"),
    walletId: lot.walletId,
    coinCode: lot.coinCode,
    lotId,
    direction: "lock",
    amount: lot.amountRemaining,
    stateBefore: lot.state,
    stateAfter: "locked",
    eventType: "coin_lot_locked",
    sourceEventId: lot.sourceEventId,
    counterpartyId: null,
    metadata: { reason },
    createdAt: nowIso()
  });

  return updatedLot;
}

export function revokeCoinLot(lotId: string, reason: string): CoinLot {
  const lot = store.coinLots.get(lotId);
  if (!lot) throw new Error(`Coin lot not found: ${lotId}`);
  if (lot.state === "revoked") return lot;

  const account = getOrCreateCoinAccount(lot.walletId, lot.coinCode);
  const updatedAccount = subtractFromAccountState(account, lot.state, lot.amountRemaining);
  store.coinAccounts.set(getCoinAccountKey(lot.walletId, lot.coinCode), updatedAccount);

  const updatedLot: CoinLot = {
    ...lot,
    state: "revoked",
    amountRemaining: 0,
    updatedAt: nowIso()
  };
  store.coinLots.set(lotId, updatedLot);

  applyLedgerEntry({
    entryId: createId("ledger"),
    walletId: lot.walletId,
    coinCode: lot.coinCode,
    lotId,
    direction: "revoke",
    amount: lot.amountRemaining,
    stateBefore: lot.state,
    stateAfter: "revoked",
    eventType: "coin_lot_locked",
    sourceEventId: lot.sourceEventId,
    counterpartyId: null,
    metadata: { reason },
    createdAt: nowIso()
  });

  return updatedLot;
}

export function resetWalletStoreForTests(): void {
  store.wallets.clear();
  store.walletsByUserId.clear();
  store.coinAccounts.clear();
  store.coinLots.clear();
  store.ledgerEntries.length = 0;
  store.conversions.length = 0;
}
