export function coerceLimit(value: unknown, fallback = 50, max = 100): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}
