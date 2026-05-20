export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (value === null || value === undefined) return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function toStringValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
