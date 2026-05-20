export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function money(value: number): number {
  return Number(value.toFixed(8));
}

export function abs(value: number): number {
  return Math.abs(value);
}

export function isDelta(value: number, epsilon = 0.000001): boolean {
  return Math.abs(value) > epsilon;
}

export function signedLedgerAmount(row: Record<string, unknown>): number {
  const amount = Math.abs(toNumber(row.amount));
  const direction = String(row.direction ?? row.entry_direction ?? "").toLowerCase();

  if (direction === "credit") return amount;
  if (direction === "debit") return -amount;

  return toNumber(row.amount);
}

export function sumRows(
  rows: Array<Record<string, unknown>>,
  amountKey = "amount"
): number {
  return money(rows.reduce((sum, row) => sum + toNumber(row[amountKey]), 0));
}

export function sumWhere(
  rows: Array<Record<string, unknown>>,
  predicate: (row: Record<string, unknown>) => boolean,
  amountKey = "amount"
): number {
  return money(
    rows.reduce((sum, row) => {
      if (!predicate(row)) return sum;
      return sum + toNumber(row[amountKey]);
    }, 0)
  );
}

export function sumSignedLedger(
  rows: Array<Record<string, unknown>>,
  predicate?: (row: Record<string, unknown>) => boolean
): number {
  return money(
    rows.reduce((sum, row) => {
      if (predicate && !predicate(row)) return sum;
      return sum + signedLedgerAmount(row);
    }, 0)
  );
}

export function dateRangeForReportDate(reportDate: string): {
  periodStart: string;
  periodEnd: string;
} {
  const start = new Date(`${reportDate}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString()
  };
}
