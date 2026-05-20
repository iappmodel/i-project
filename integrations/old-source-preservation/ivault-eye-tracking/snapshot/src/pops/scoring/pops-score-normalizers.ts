export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return Number(value.toFixed(6));
}

export function normalizeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return clamp01(numerator / denominator);
}

export function normalizeBounded(
  value: number,
  min: number,
  max: number,
  options?: {
    invert?: boolean;
  },
): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 0;
  }
  const normalized = clamp01((value - min) / (max - min));
  return options?.invert ? clamp01(1 - normalized) : normalized;
}

export function weightedAverage(
  items: Array<{ value: number; weight: number }>,
): number {
  const valid = items
    .filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0)
    .map((item) => ({ value: clamp01(item.value), weight: item.weight }));

  if (valid.length === 0) return 0;

  const weightSum = valid.reduce((sum, item) => sum + item.weight, 0);
  if (weightSum <= 0) return 0;

  const weightedSum = valid.reduce((sum, item) => sum + item.value * item.weight, 0);
  return clamp01(weightedSum / weightSum);
}

export function redistributeWeight(
  weights: Record<string, number>,
  fromKey: string,
  toKeys: string[],
): Record<string, number> {
  const redistributed = { ...weights };
  const fromWeight = redistributed[fromKey] ?? 0;
  redistributed[fromKey] = 0;
  if (fromWeight <= 0 || toKeys.length === 0) return redistributed;

  const perKey = fromWeight / toKeys.length;
  for (const key of toKeys) {
    redistributed[key] = (redistributed[key] ?? 0) + perKey;
  }
  return redistributed;
}
