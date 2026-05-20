import type { StudioCoin, StudioLedgerEntry, StudioLedgerEntryType, StudioWalletAccount, StudioWalletBalance } from "./studioWalletTypes";

function cloneAccounts(accounts: StudioWalletAccount[]): StudioWalletAccount[] {
  return JSON.parse(JSON.stringify(accounts)) as StudioWalletAccount[];
}

function getBalanceRow(account: StudioWalletAccount, coin: StudioCoin): StudioWalletBalance {
  let row = account.balances.find((b) => b.coin === coin);
  if (!row) {
    row = { coin, available: 0, pending: 0, reserved: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
  }
  return { ...row };
}

function setBalanceRow(account: StudioWalletAccount, row: StudioWalletBalance): StudioWalletAccount {
  const others = account.balances.filter((b) => b.coin !== row.coin);
  return { ...account, balances: [...others, row] };
}

export function getBalance(account: StudioWalletAccount, coin: StudioCoin): StudioWalletBalance {
  return getBalanceRow(account, coin);
}

export function hasSufficientBalance(account: StudioWalletAccount, coin: StudioCoin, amount: number): boolean {
  const b = getBalanceRow(account, coin);
  return b.available + 1e-9 >= amount;
}

export function formatCoinAmount(amount: number, coin: StudioCoin): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${n.toFixed(2)} ${coin}`;
}

export function sumLedgerByType(entries: StudioLedgerEntry[], type: StudioLedgerEntryType): number {
  return entries.filter((e) => e.type === type && e.status === "completed").reduce((s, e) => s + e.amount, 0);
}

export type CreateLedgerEntryInput = Omit<StudioLedgerEntry, "id" | "createdAt"> & { id?: string; createdAt?: string };

export function createLedgerEntry(input: CreateLedgerEntryInput): StudioLedgerEntry {
  const id = input.id ?? `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = input.createdAt ?? new Date().toISOString();
  return { ...input, id, createdAt };
}

function applyAmountToAvailable(row: StudioWalletBalance, delta: number, kind: "earn" | "spend"): StudioWalletBalance {
  const next = { ...row, available: row.available + delta };
  if (kind === "earn" && delta > 0) next.lifetimeEarned = row.lifetimeEarned + delta;
  if (kind === "spend" && delta < 0) next.lifetimeSpent = row.lifetimeSpent - delta;
  return next;
}

function applyPending(row: StudioWalletBalance, delta: number): StudioWalletBalance {
  return { ...row, pending: row.pending + delta };
}

function applyReserved(row: StudioWalletBalance, delta: number): StudioWalletBalance {
  return { ...row, reserved: row.reserved + delta };
}

function findAccount(accounts: StudioWalletAccount[], id: string | undefined): StudioWalletAccount | undefined {
  if (!id) return undefined;
  return accounts.find((a) => a.id === id);
}

/**
 * Apply a single ledger entry to cloned accounts. Does not mutate `accounts` input when passed clone.
 */
export function applyLedgerEntry(accounts: StudioWalletAccount[], entry: StudioLedgerEntry): StudioWalletAccount[] {
  let next = accounts;
  const touch = (accountId: string, fn: (a: StudioWalletAccount) => StudioWalletAccount) => {
    next = next.map((a) => (a.id === accountId ? fn(a) : a));
  };

  if (entry.status !== "completed" && entry.status !== "pending") {
    return cloneAccounts(next);
  }

  const coin = entry.coin;
  const amt = entry.amount;

  switch (entry.type) {
    case "magic_unlock_payment":
    case "magic_unlock_tip": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, -amt, "spend"));
        });
      }
      break;
    }
    case "magic_creator_pending_credit": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, -amt, "spend"));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyPending(row, amt));
        });
      }
      break;
    }
    case "magic_platform_fee": {
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, amt, "earn"));
        });
      }
      break;
    }
    case "magic_platform_fee_from_pending": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyPending(row, -amt));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, amt, "earn"));
        });
      }
      break;
    }
    case "magic_creator_pending_debit": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyPending(row, -amt));
        });
      }
      break;
    }
    case "magic_pending_release": {
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, {
            ...row,
            pending: Math.max(0, row.pending - amt),
            available: row.available + amt,
          });
        });
      }
      break;
    }
    case "magic_viewer_reward":
    case "magic_ad_reward": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, -amt, "spend"));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          // Reward after verification lands available; pending path uses metadata flag
          const asPending = entry.metadata?.settleAsPending === true;
          if (asPending) {
            return setBalanceRow(a, applyPending(row, amt));
          }
          return setBalanceRow(a, applyAmountToAvailable(row, amt, "earn"));
        });
      }
      break;
    }
    case "escrow_hold": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, -amt, "spend"));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyPending(row, amt));
        });
      }
      break;
    }
    case "escrow_release": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyPending(row, -amt));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyPending(row, amt));
        });
      }
      break;
    }
    case "magic_settlement_release": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyPending(row, -amt));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, amt, "earn"));
        });
      }
      break;
    }
    case "magic_refund": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, -amt, "spend"));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, amt, "earn"));
        });
      }
      break;
    }
    case "magic_settlement_reversal":
    case "magic_reward_reversal": {
      if (entry.fromAccountId) {
        touch(entry.fromAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, -amt, "spend"));
        });
      }
      if (entry.toAccountId) {
        touch(entry.toAccountId, (a) => {
          const row = getBalanceRow(a, coin);
          return setBalanceRow(a, applyAmountToAvailable(row, amt, "earn"));
        });
      }
      break;
    }
    default:
      break;
  }

  return cloneAccounts(next);
}

export function applyLedgerEntries(accounts: StudioWalletAccount[], entries: StudioLedgerEntry[]): StudioWalletAccount[] {
  let acc = cloneAccounts(accounts);
  for (const e of entries) {
    acc = applyLedgerEntry(acc, e);
  }
  return acc;
}

export { findAccount };
