import type { ReleaseExecutionRecord } from "./release-execution.js";

export interface ReleaseExecutionStore {
  save(record: ReleaseExecutionRecord): ReleaseExecutionRecord;
  getBySessionId(sessionId: string): ReleaseExecutionRecord | null;
}

export class ReleaseExecutionConflictError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Release execution record already exists for sessionId: ${sessionId}`);
    this.name = "ReleaseExecutionConflictError";
    this.sessionId = sessionId;
  }
}

export class InMemoryReleaseExecutionStore implements ReleaseExecutionStore {
  private readonly bySessionId = new Map<string, ReleaseExecutionRecord>();

  save(record: ReleaseExecutionRecord): ReleaseExecutionRecord {
    if (this.bySessionId.has(record.sessionId)) {
      throw new ReleaseExecutionConflictError(record.sessionId);
    }

    this.bySessionId.set(record.sessionId, record);
    return record;
  }

  getBySessionId(sessionId: string): ReleaseExecutionRecord | null {
    return this.bySessionId.get(sessionId) ?? null;
  }

  clear(): void {
    this.bySessionId.clear();
  }
}
