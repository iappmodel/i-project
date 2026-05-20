export function parseMinorUnits(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error("Money values must be integer minor units.");
  }

  return parsed;
}
