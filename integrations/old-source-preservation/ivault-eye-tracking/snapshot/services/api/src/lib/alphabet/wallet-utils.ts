import type { CoinBalanceState, CoinCode } from "../../types/alphabet/coin.types";
import type {
  CoinLot,
  CoinLotSourceType,
  LedgerDirection,
  LedgerEntry
} from "../../types/alphabet/wallet.types";

export function calculateAvailableBalance(lots: ReadonlyArray<CoinLot>): number {
  return lots
    .filter((lot) => lot.state === "available")
    .reduce((sum, lot) => sum + lot.amountRemaining, 0);
}

export function calculatePendingBalance(lots: ReadonlyArray<CoinLot>): number {
  return lots
    .filter((lot) => lot.state === "pending")
    .reduce((sum, lot) => sum + lot.amountRemaining, 0);
}

export function createLedgerEntry(params: {
  entryId: string;
  walletId: string;
  coinCode: CoinCode;
  direction: LedgerDirection;
  amount: number;
  eventType: string;
  lotId?: string | null;
  sourceEventId?: string | null;
  counterpartyId?: string | null;
  stateBefore?: CoinBalanceState | null;
  stateAfter?: CoinBalanceState | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}): LedgerEntry {
  if (params.amount < 0) {
    throw new Error("Ledger amount cannot be negative.");
  }

  return {
    entryId: params.entryId,
    walletId: params.walletId,
    coinCode: params.coinCode,
    lotId: params.lotId ?? null,
    direction: params.direction,
    amount: params.amount,
    stateBefore: params.stateBefore ?? null,
    stateAfter: params.stateAfter ?? null,
    eventType: params.eventType,
    sourceEventId: params.sourceEventId ?? null,
    counterpartyId: params.counterpartyId ?? null,
    metadata: params.metadata ?? {},
    createdAt: params.createdAt ?? new Date().toISOString()
  };
}

export function createCoinLot(params: {
  lotId: string;
  walletId: string;
  coinCode: CoinCode;
  sourceEventId: string;
  sourceType: CoinLotSourceType;
  amountOriginal: number;
  state?: CoinBalanceState;
  amountRemaining?: number;
  spendRestriction?: string | null;
  ageRestriction?: string | null;
  expiresAt?: string | null;
  availableAt?: string | null;
  riskHoldUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
}): CoinLot {
  if (params.amountOriginal < 0) {
    throw new Error("Lot amountOriginal cannot be negative.");
  }

  const amountRemaining = params.amountRemaining ?? params.amountOriginal;
  if (amountRemaining < 0) {
    throw new Error("Lot amountRemaining cannot be negative.");
  }

  const createdAt = params.createdAt ?? new Date().toISOString();

  return {
    lotId: params.lotId,
    walletId: params.walletId,
    coinCode: params.coinCode,
    sourceEventId: params.sourceEventId,
    sourceType: params.sourceType,
    amountOriginal: params.amountOriginal,
    amountRemaining,
    state: params.state ?? "pending",
    spendRestriction: params.spendRestriction ?? null,
    ageRestriction: params.ageRestriction ?? null,
    expiresAt: params.expiresAt ?? null,
    availableAt: params.availableAt ?? null,
    riskHoldUntil: params.riskHoldUntil ?? null,
    createdAt,
    updatedAt: params.updatedAt ?? createdAt
  };
}
