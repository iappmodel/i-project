import type {
  TreasuryActionType,
  TreasuryEvaluationResult,
  TreasuryReserveAccount,
  TreasuryReserveType,
  TreasurySignalInput
} from "../../types/alphabet/treasury.types";
import { evaluateTreasuryAction } from "./treasury-engine";

type TreasuryStoreState = {
  accounts: Map<string, TreasuryReserveAccount>;
  results: Map<string, TreasuryEvaluationResult>;
};

const store: TreasuryStoreState = {
  accounts: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function calculateAvailable(params: {
  totalReserveBalance: number;
  allocatedBalance: number;
  lockedBalance: number;
  pendingObligationBalance: number;
}): number {
  return Number(
    Math.max(
      0,
      params.totalReserveBalance -
        params.allocatedBalance -
        params.lockedBalance -
        params.pendingObligationBalance
    ).toFixed(6)
  );
}

export function createTreasuryReserveAccount(params: {
  reserveType: TreasuryReserveType;
  coinCode: string;
  currencyCode: string;
  totalReserveBalance: number;
  allocatedBalance?: number;
  lockedBalance?: number;
  pendingObligationBalance?: number;
  expectedInflows?: number;
  expectedOutflows?: number;
}): TreasuryReserveAccount {
  const now = nowIso();

  const allocatedBalance = params.allocatedBalance ?? 0;
  const lockedBalance = params.lockedBalance ?? 0;
  const pendingObligationBalance = params.pendingObligationBalance ?? 0;

  const account: TreasuryReserveAccount = {
    treasuryAccountId: createId("treasury_account"),
    reserveType: params.reserveType,
    coinCode: params.coinCode,
    currencyCode: params.currencyCode,
    totalReserveBalance: params.totalReserveBalance,
    allocatedBalance,
    availableBalance: calculateAvailable({
      totalReserveBalance: params.totalReserveBalance,
      allocatedBalance,
      lockedBalance,
      pendingObligationBalance
    }),
    lockedBalance,
    pendingObligationBalance,
    expectedInflows: params.expectedInflows ?? 0,
    expectedOutflows: params.expectedOutflows ?? 0,
    status: "active",
    createdAt: now,
    updatedAt: now
  };

  store.accounts.set(account.treasuryAccountId, account);

  return account;
}

export function getTreasuryReserveAccount(
  treasuryAccountId: string
): TreasuryReserveAccount | null {
  return store.accounts.get(treasuryAccountId) ?? null;
}

export function listTreasuryReserveAccounts(
  reserveType?: TreasuryReserveType
): TreasuryReserveAccount[] {
  return Array.from(store.accounts.values()).filter((account) =>
    reserveType ? account.reserveType === reserveType : true
  );
}

function mapStatus(
  status: TreasuryEvaluationResult["status"]
): TreasuryReserveAccount["status"] {
  switch (status) {
    case "healthy":
      return "active";
    case "watch":
      return "watch";
    case "constrained":
      return "constrained";
    case "reserve_locked":
    case "liquidity_blocked":
      return "locked";
    case "budget_blocked":
      return "blocked";
    case "critical":
      return "critical";
    default:
      return "watch";
  }
}

export function evaluateStoredTreasuryAction(
  input: Omit<
    TreasurySignalInput,
    | "treasuryAccountId"
    | "reserveType"
    | "coinCode"
    | "currencyCode"
    | "totalReserveBalance"
    | "allocatedBalance"
    | "availableBalance"
    | "lockedBalance"
    | "pendingObligationBalance"
    | "expectedInflows"
    | "expectedOutflows"
  > & {
    treasuryAccountId: string;
    actionType: TreasuryActionType;
  }
): TreasuryEvaluationResult {
  const account = getTreasuryReserveAccount(input.treasuryAccountId);

  if (!account) {
    throw new Error("Treasury reserve account not found.");
  }

  const result = evaluateTreasuryAction({
    ...input,
    treasuryAccountId: account.treasuryAccountId,
    reserveType: account.reserveType,
    coinCode: account.coinCode,
    currencyCode: account.currencyCode,
    totalReserveBalance: account.totalReserveBalance,
    allocatedBalance: account.allocatedBalance,
    availableBalance: account.availableBalance,
    lockedBalance: account.lockedBalance,
    pendingObligationBalance: account.pendingObligationBalance,
    expectedInflows: account.expectedInflows,
    expectedOutflows: account.expectedOutflows,
    metadata: {
      ...input.metadata
    }
  });

  const now = nowIso();

  const nextAllocated = Number(
    (account.allocatedBalance + result.reservedAmount - result.releasedAmount).toFixed(
      6
    )
  );

  const nextLocked =
    result.reserveLocked || result.liquidityLocked
      ? Number((account.lockedBalance + account.availableBalance).toFixed(6))
      : account.lockedBalance;

  const next: TreasuryReserveAccount = {
    ...account,
    allocatedBalance: Math.max(0, nextAllocated),
    lockedBalance: Math.max(0, nextLocked),
    availableBalance: calculateAvailable({
      totalReserveBalance: account.totalReserveBalance,
      allocatedBalance: Math.max(0, nextAllocated),
      lockedBalance: Math.max(0, nextLocked),
      pendingObligationBalance: account.pendingObligationBalance
    }),
    status: mapStatus(result.status),
    updatedAt: now
  };

  store.accounts.set(next.treasuryAccountId, next);
  store.results.set(result.treasuryAccountId, result);

  return result;
}

export function getTreasuryEvaluationResult(
  treasuryAccountId: string
): TreasuryEvaluationResult | null {
  return store.results.get(treasuryAccountId) ?? null;
}

export function resetTreasuryStoreForTests(): void {
  store.accounts.clear();
  store.results.clear();
}
