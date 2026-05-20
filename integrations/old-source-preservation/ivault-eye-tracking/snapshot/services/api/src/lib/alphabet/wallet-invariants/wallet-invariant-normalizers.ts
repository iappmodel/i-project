export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function roundMoney(value: number): number {
  return Number(value.toFixed(8));
}

/** Signed amount from legacy direction / type fields (withdrawal heuristics). */
export function ledgerSignedAmount(row: Record<string, unknown>): number {
  const amount = toNumber(row.amount);
  const direction = String(row.direction ?? row.entry_direction ?? "").toLowerCase();

  if (direction === "debit") return -Math.abs(amount);
  if (direction === "credit") return Math.abs(amount);

  const ledgerType = String(row.ledger_type ?? row.entry_type ?? "").toLowerCase();
  if (ledgerType.includes("debit") || ledgerType.includes("withdrawal")) {
    return -Math.abs(amount);
  }

  return amount;
}

export function ledgerIsPosted(row: Record<string, unknown>): boolean {
  return String(row.ledger_status ?? row.status ?? "posted").toLowerCase() === "posted";
}

/**
 * Bucket balances from posted rows using authoritative delta columns (DbLedgerEntry).
 */
export function computeBalancesFromLedgers(ledgers: Array<Record<string, unknown>>) {
  let available = 0;
  let pending = 0;
  let reserved = 0;

  for (const ledger of ledgers) {
    if (!ledgerIsPosted(ledger)) continue;
    available += toNumber(ledger.available_delta);
    pending += toNumber(ledger.pending_delta);
    reserved += toNumber(ledger.locked_delta);
  }

  return {
    computedAvailableBalance: roundMoney(available),
    computedPendingBalance: roundMoney(pending),
    computedReservedBalance: roundMoney(reserved),
    computedTotalBalance: roundMoney(available + pending + reserved)
  };
}

/** Sum of direction-based signed amounts for posted rows (cross-check vs deltas). */
export function computeLedgerSignedSumFromAmount(ledgers: Array<Record<string, unknown>>): number {
  let sum = 0;
  for (const ledger of ledgers) {
    if (!ledgerIsPosted(ledger)) continue;
    sum += ledgerSignedAmount(ledger);
  }
  return roundMoney(sum);
}

export function computeLedgerDeltaSum(ledgers: Array<Record<string, unknown>>): number {
  let sum = 0;
  for (const ledger of ledgers) {
    if (!ledgerIsPosted(ledger)) continue;
    sum +=
      toNumber(ledger.available_delta) + toNumber(ledger.pending_delta) + toNumber(ledger.locked_delta);
  }
  return roundMoney(sum);
}

export function computeValueLotTotal(valueLots: Array<Record<string, unknown>>) {
  return roundMoney(
    valueLots.reduce((sum, lot) => {
      const status = String(lot.status ?? lot.lot_status ?? "active").toLowerCase();
      if (status === "expired" || status === "consumed" || status === "voided") {
        return sum;
      }

      return sum + toNumber(lot.remaining_amount ?? lot.amount ?? 0);
    }, 0)
  );
}

export function calculateBalanceDeltas(params: {
  computedAvailableBalance: number;
  computedPendingBalance: number;
  computedReservedBalance: number;
  computedTotalBalance: number;

  storedAvailableBalance: number;
  storedPendingBalance: number;
  storedReservedBalance: number;
  storedTotalBalance: number;
}) {
  return {
    availableDelta: roundMoney(params.storedAvailableBalance - params.computedAvailableBalance),
    pendingDelta: roundMoney(params.storedPendingBalance - params.computedPendingBalance),
    reservedDelta: roundMoney(params.storedReservedBalance - params.computedReservedBalance),
    totalDelta: roundMoney(params.storedTotalBalance - params.computedTotalBalance)
  };
}
