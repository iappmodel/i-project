function randomSuffix(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Creates a stable local id. Uses `crypto.randomUUID` when available; otherwise timestamp + random.
 */
export function createPopsId(prefix?: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const uuidOrFallback = g.crypto?.randomUUID?.() ?? randomSuffix();
  if (prefix && prefix.length > 0) {
    return `${prefix}_${uuidOrFallback}`;
  }
  return uuidOrFallback;
}
