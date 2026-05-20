function parseIsoSafe(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function nowMs(): number {
  return Date.now();
}

export function addMinutesIso(dateIso: string, minutes: number): string {
  const t = parseIsoSafe(dateIso);
  if (t === null) return nowIso();
  return new Date(t + minutes * 60_000).toISOString();
}

export function addDaysIso(dateIso: string, days: number): string {
  const t = parseIsoSafe(dateIso);
  if (t === null) return nowIso();
  return new Date(t + days * 86_400_000).toISOString();
}

export function diffMs(startIso: string, endIso: string): number {
  const a = parseIsoSafe(startIso);
  const b = parseIsoSafe(endIso);
  if (a === null || b === null) return 0;
  return Math.max(0, b - a);
}

export function clampNonNegativeMs(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}
