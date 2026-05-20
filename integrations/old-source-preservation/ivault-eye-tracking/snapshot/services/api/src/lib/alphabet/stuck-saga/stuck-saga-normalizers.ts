export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function money(value: number): number {
  return Number(value.toFixed(8));
}

export function secondsBetween(
  start?: string | null,
  end?: string | null
): number {
  if (!start || !end) return 0;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;

  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

export function newestDate(
  values: Array<string | null | undefined>
): string | null {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);

  if (!timestamps.length) return null;

  return new Date(Math.max(...timestamps)).toISOString();
}

export function oldestDate(
  values: Array<string | null | undefined>
): string | null {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);

  if (!timestamps.length) return null;

  return new Date(Math.min(...timestamps)).toISOString();
}

export function isMoneyTarget(value?: string | null): boolean {
  const normalized = String(value ?? "").toLowerCase();

  return (
    normalized.includes("wallet") ||
    normalized.includes("withdraw") ||
    normalized.includes("payout") ||
    normalized.includes("conversion") ||
    normalized.includes("transfer") ||
    normalized.includes("ledger")
  );
}

export function ledgerDebitAmount(row: Record<string, unknown>): number {
  const amount = Math.abs(toNumber(row.amount));
  const direction = String(
    row.direction ?? row.entry_direction ?? ""
  ).toLowerCase();

  if (direction === "debit") return amount;

  const type = String(
    row.ledger_type ?? row.entry_type ?? row.reason_code ?? ""
  ).toLowerCase();

  if (type.includes("debit") || type.includes("withdraw")) {
    return amount;
  }

  return 0;
}

export function sumDebits(rows: Array<Record<string, unknown>>): number {
  return money(rows.reduce((sum, row) => sum + ledgerDebitAmount(row), 0));
}

export function sumTransferAmount(
  rows: Array<Record<string, unknown>>,
  statuses?: string[]
): number {
  return money(
    rows.reduce((sum, row) => {
      const status = String(row.status ?? row.transfer_status ?? "");
      if (statuses && !statuses.includes(status)) return sum;
      return sum + toNumber(row.amount);
    }, 0)
  );
}
