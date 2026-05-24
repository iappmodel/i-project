import type { LedgerEntry } from "./ledger-entry.js";

export interface LedgerEntryStore {
  save(entry: LedgerEntry): LedgerEntry;
  getBySourceRef(sourceRef: string): LedgerEntry | null;
  getBySessionId(sessionId: string): LedgerEntry | null;
}

export class LedgerEntryConflictError extends Error {
  readonly sourceRef: string;

  constructor(sourceRef: string) {
    super(`Ledger entry already exists for sourceRef: ${sourceRef}`);
    this.name = "LedgerEntryConflictError";
    this.sourceRef = sourceRef;
  }
}

export class InMemoryLedgerEntryStore implements LedgerEntryStore {
  private readonly bySourceRef = new Map<string, LedgerEntry>();
  private readonly bySessionId = new Map<string, LedgerEntry>();

  save(entry: LedgerEntry): LedgerEntry {
    if (this.bySourceRef.has(entry.sourceRef)) {
      throw new LedgerEntryConflictError(entry.sourceRef);
    }

    this.bySourceRef.set(entry.sourceRef, entry);
    this.bySessionId.set(entry.sessionId, entry);
    return entry;
  }

  getBySourceRef(sourceRef: string): LedgerEntry | null {
    return this.bySourceRef.get(sourceRef) ?? null;
  }

  getBySessionId(sessionId: string): LedgerEntry | null {
    return this.bySessionId.get(sessionId) ?? null;
  }

  clear(): void {
    this.bySourceRef.clear();
    this.bySessionId.clear();
  }
}
