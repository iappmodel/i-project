export function dateRangeForTrustFraudBatchDate(batchDate: string) {
  const start = new Date(`${batchDate}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString()
  };
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

export function groupBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T
): Record<string, T[]> {
  return rows.reduce(
    (acc, row) => {
      const value = String(row[key] ?? "unknown");
      acc[value] = acc[value] ?? [];
      acc[value].push(row);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function sumBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): number {
  return rows.reduce((sum, row) => sum + toNumber(row[key]), 0);
}

export function isFailureStatus(value: unknown): boolean {
  const status = String(value ?? "").toLowerCase();

  return (
    status.includes("failed") ||
    status.includes("rejected") ||
    status.includes("blocked") ||
    status.includes("critical") ||
    status.includes("requires_review") ||
    status.includes("dead_lettered")
  );
}

export function isMoneyObject(value?: string | null): boolean {
  const normalized = String(value ?? "").toLowerCase();

  return (
    normalized.includes("wallet") ||
    normalized.includes("ledger") ||
    normalized.includes("payout") ||
    normalized.includes("withdraw") ||
    normalized.includes("transfer") ||
    normalized.includes("payment") ||
    normalized.includes("compensation")
  );
}

export function normalizeRiskScore(value: unknown): number {
  const number = toNumber(value);

  if (number > 1) return clamp(number / 100);
  return clamp(number);
}

export function uniqueCount(values: Array<string | null | undefined>): number {
  return new Set(values.filter(Boolean).map(String)).size;
}
