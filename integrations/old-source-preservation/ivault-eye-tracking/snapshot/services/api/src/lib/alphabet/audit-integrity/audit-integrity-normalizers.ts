export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function ledgerIsPosted(row: Record<string, unknown>): boolean {
  return String(row.ledger_status ?? row.status ?? "posted").toLowerCase() === "posted";
}

export function auditBlobContainsId(
  audit: Record<string, unknown>,
  id: string
): boolean {
  if (!id) return false;
  const parts: unknown[] = [
    audit.evidence,
    audit.redacted_evidence,
    audit.metadata,
    audit.internal_summary,
    audit.public_summary,
    audit.source_event_ids
  ];
  for (const p of parts) {
    if (p === null || p === undefined) continue;
    try {
      if (typeof p === "string") {
        if (p.includes(id)) return true;
      } else {
        const s = JSON.stringify(p);
        if (s.includes(id)) return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}
