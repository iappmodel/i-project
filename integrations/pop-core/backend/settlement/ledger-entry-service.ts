import {
  buildLedgerCreditEntryFromReleaseExecution,
  type LedgerEntry
} from "./ledger-entry.js";
import {
  InMemoryLedgerEntryStore,
  type LedgerEntryStore
} from "./ledger-entry-store.js";
import type { ReleaseExecutionRecord } from "./release-execution.js";

export type PostLedgerCreditOutcome = "posted" | "existing";

export interface PostLedgerCreditFromReleaseExecutionResult {
  outcome: PostLedgerCreditOutcome;
  sessionId: string;
  entry?: LedgerEntry;
}

export interface PostLedgerCreditFromReleaseExecutionOptions {
  store?: LedgerEntryStore;
  postedAt?: string;
}

export function postLedgerCreditFromReleaseExecution(
  execution: ReleaseExecutionRecord,
  options?: PostLedgerCreditFromReleaseExecutionOptions
): PostLedgerCreditFromReleaseExecutionResult {
  const store = options?.store ?? new InMemoryLedgerEntryStore();
  const sessionId = execution.sessionId;

  const existing = store.getBySourceRef(execution.executionRef);
  if (existing) {
    return {
      outcome: "existing",
      sessionId,
      entry: existing
    };
  }

  const entry = buildLedgerCreditEntryFromReleaseExecution(execution, {
    postedAt: options?.postedAt
  });

  store.save(entry);

  return {
    outcome: "posted",
    sessionId,
    entry
  };
}

export class LedgerEntryService {
  constructor(
    private readonly store: LedgerEntryStore = new InMemoryLedgerEntryStore()
  ) {}

  postLedgerCreditFromReleaseExecution(
    execution: ReleaseExecutionRecord,
    options?: Omit<PostLedgerCreditFromReleaseExecutionOptions, "store">
  ): PostLedgerCreditFromReleaseExecutionResult {
    return postLedgerCreditFromReleaseExecution(execution, { ...options, store: this.store });
  }

  getEntryBySourceRef(sourceRef: string): LedgerEntry | null {
    return this.store.getBySourceRef(sourceRef);
  }

  getEntryBySessionId(sessionId: string): LedgerEntry | null {
    return this.store.getBySessionId(sessionId);
  }
}
