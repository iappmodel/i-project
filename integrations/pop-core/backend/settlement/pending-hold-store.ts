import { normalizePendingHoldRecord, type PendingHoldRecord } from "./pending-hold.js";

export interface PendingHoldStore {
  save(record: PendingHoldRecord): PendingHoldRecord;
  getBySessionId(sessionId: string): PendingHoldRecord | null;
}

export class PendingHoldConflictError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Pending hold record already exists for sessionId: ${sessionId}`);
    this.name = "PendingHoldConflictError";
    this.sessionId = sessionId;
  }
}

export class InMemoryPendingHoldStore implements PendingHoldStore {
  private readonly bySessionId = new Map<string, PendingHoldRecord>();

  save(record: PendingHoldRecord): PendingHoldRecord {
    if (this.bySessionId.has(record.sessionId)) {
      throw new PendingHoldConflictError(record.sessionId);
    }

    const normalized = normalizePendingHoldRecord(record);
    this.bySessionId.set(record.sessionId, normalized);
    return normalized;
  }

  getBySessionId(sessionId: string): PendingHoldRecord | null {
    return this.bySessionId.get(sessionId) ?? null;
  }

  clear(): void {
    this.bySessionId.clear();
  }
}
