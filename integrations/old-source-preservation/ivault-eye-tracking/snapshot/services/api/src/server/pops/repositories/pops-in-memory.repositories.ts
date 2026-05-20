import type {
  PopsCompletionTransaction,
  PopsEventInsert,
  PopsEventRepository,
  PopsJudgmentInsert,
  PopsJudgmentRepository,
  PopsPrivacyReceiptInsert,
  PopsPrivacyReceiptRepository,
  PopsRewardDecisionInsert,
  PopsRewardDecisionRepository,
  PopsSessionRepository,
  PopsSessionRow,
  PopsSignalBatchInsert,
  PopsSignalBatchRepository,
  PopsWalletIntentInsert,
  PopsWalletIntentRepository
} from "./pops-repository.types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryPopsTransaction implements PopsCompletionTransaction {
  constructor(private readonly stores: Array<{ snapshot: () => unknown; restore: (value: unknown) => void }>) {}

  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const snapshots = this.stores.map((store) => store.snapshot());
    try {
      return await fn();
    } catch (error) {
      this.stores.forEach((store, index) => {
        store.restore(snapshots[index]);
      });
      throw error;
    }
  }
}

export class InMemoryPopsSessionRepository implements PopsSessionRepository {
  private readonly sessions = new Map<string, PopsSessionRow>();

  async createSession(input: Record<string, unknown>): Promise<PopsSessionRow> {
    const id = String(input.id ?? crypto.randomUUID());
    const row: PopsSessionRow = {
      id,
      user_id: String(input.user_id ?? input.userId ?? ""),
      device_id: String(input.device_id ?? input.deviceId ?? ""),
      content_id: (input.content_id as string | null | undefined) ?? null,
      campaign_id: (input.campaign_id as string | null | undefined) ?? null,
      session_type: String(input.session_type ?? input.sessionType ?? "FEED_VIEW"),
      proof_level: String(input.proof_level ?? input.proofLevel ?? "LEVEL_1_SESSION"),
      state: String(input.state ?? "INITIALIZING"),
      started_at: String(input.started_at ?? input.startedAt ?? new Date().toISOString()),
      ended_at: (input.ended_at as string | null | undefined) ?? null,
      metadata: (input.metadata as Record<string, unknown> | null | undefined) ?? null,
      created_at: new Date().toISOString(),
      updated_at: null
    };
    this.sessions.set(id, row);
    return clone(row);
  }

  async getSessionById(sessionId: string): Promise<PopsSessionRow | null> {
    return clone(this.sessions.get(sessionId) ?? null);
  }

  async updateSessionState(
    sessionId: string,
    state: string,
    patch: Record<string, unknown> = {}
  ): Promise<PopsSessionRow> {
    const existing = this.sessions.get(sessionId);
    if (!existing) throw new Error("session not found");
    const next: PopsSessionRow = {
      ...existing,
      ...patch,
      state,
      updated_at: new Date().toISOString()
    } as PopsSessionRow;
    this.sessions.set(sessionId, next);
    return clone(next);
  }

  async closeSession(sessionId: string, patch: Record<string, unknown> = {}): Promise<PopsSessionRow> {
    return this.updateSessionState(sessionId, "CLOSED", {
      ...patch,
      ended_at: patch.ended_at ?? new Date().toISOString()
    });
  }

  snapshot(): unknown {
    return clone(Array.from(this.sessions.entries()));
  }

  restore(value: unknown): void {
    this.sessions.clear();
    for (const [id, row] of value as Array<[string, PopsSessionRow]>) {
      this.sessions.set(id, row);
    }
  }
}

export class InMemoryPopsEventRepository implements PopsEventRepository, PopsSignalBatchRepository {
  private events: Array<Record<string, unknown>> = [];
  private batches: Array<Record<string, unknown>> = [];

  async insertEventsDeduped(events: PopsEventInsert[]): Promise<{ inserted: number; deduped: number }> {
    let inserted = 0;
    let deduped = 0;
    for (const event of events) {
      const exists = this.events.some(
        (row) => row.session_id === event.session_id && row.event_id === event.event_id
      );
      if (exists) {
        deduped += 1;
        continue;
      }
      this.events.push({ ...event, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      inserted += 1;
    }
    return { inserted, deduped };
  }

  async getEventsBySession(sessionId: string): Promise<Array<Record<string, unknown>>> {
    return clone(this.events.filter((row) => row.session_id === sessionId));
  }

  async insertSignalBatchDeduped(
    batch: PopsSignalBatchInsert
  ): Promise<{ inserted: boolean; deduped: boolean }> {
    const exists = this.batches.some(
      (row) => row.session_id === batch.session_id && row.batch_id === batch.batch_id
    );
    if (exists) return { inserted: false, deduped: true };
    this.batches.push({ ...batch, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    return { inserted: true, deduped: false };
  }

  async getSignalBatchesBySession(sessionId: string): Promise<Array<Record<string, unknown>>> {
    return clone(this.batches.filter((row) => row.session_id === sessionId));
  }

  snapshot(): unknown {
    return clone({ events: this.events, batches: this.batches });
  }

  restore(value: unknown): void {
    const typed = value as { events: Array<Record<string, unknown>>; batches: Array<Record<string, unknown>> };
    this.events = clone(typed.events);
    this.batches = clone(typed.batches);
  }
}

class InMemorySingleRowStore<TCreate extends Record<string, unknown>>
  implements
    PopsJudgmentRepository,
    PopsRewardDecisionRepository,
    PopsWalletIntentRepository,
    PopsPrivacyReceiptRepository
{
  private rows: Array<Record<string, unknown>> = [];
  constructor(private readonly sessionField = "session_id", private readonly rewardDecisionField = "reward_decision_id") {}

  async createJudgment(row: PopsJudgmentInsert): Promise<Record<string, unknown>> {
    const next = { ...row, id: String(row.id ?? crypto.randomUUID()) };
    this.rows.push(next);
    return clone(next);
  }

  async getJudgmentBySession(sessionId: string): Promise<Record<string, unknown> | null> {
    return clone(this.rows.find((row) => row[this.sessionField] === sessionId) ?? null);
  }

  async createRewardDecision(row: PopsRewardDecisionInsert): Promise<Record<string, unknown>> {
    const next = { ...row, id: String(row.id ?? crypto.randomUUID()) };
    this.rows.push(next);
    return clone(next);
  }

  async getRewardDecisionBySession(sessionId: string): Promise<Record<string, unknown> | null> {
    return clone(this.rows.find((row) => row[this.sessionField] === sessionId) ?? null);
  }

  async createWalletIntent(row: PopsWalletIntentInsert): Promise<Record<string, unknown>> {
    const next = { ...row, id: String(row.id ?? crypto.randomUUID()) };
    this.rows.push(next);
    return clone(next);
  }

  async getWalletIntentByRewardDecision(
    rewardDecisionId: string
  ): Promise<Record<string, unknown> | null> {
    return clone(this.rows.find((row) => row[this.rewardDecisionField] === rewardDecisionId) ?? null);
  }

  async createPrivacyReceipt(row: PopsPrivacyReceiptInsert): Promise<Record<string, unknown>> {
    const next = { ...row, id: String(row.id ?? crypto.randomUUID()) };
    this.rows.push(next);
    return clone(next);
  }

  async getPrivacyReceiptBySession(sessionId: string): Promise<Record<string, unknown> | null> {
    return clone(this.rows.find((row) => row[this.sessionField] === sessionId) ?? null);
  }

  snapshot(): unknown {
    return clone(this.rows);
  }

  restore(value: unknown): void {
    this.rows = clone(value as Array<Record<string, unknown>>);
  }
}

export class InMemoryPopsJudgmentRepository extends InMemorySingleRowStore<PopsJudgmentInsert> {}
export class InMemoryPopsRewardDecisionRepository extends InMemorySingleRowStore<PopsRewardDecisionInsert> {}
export class InMemoryPopsWalletIntentRepository extends InMemorySingleRowStore<PopsWalletIntentInsert> {}
export class InMemoryPopsPrivacyReceiptRepository extends InMemorySingleRowStore<PopsPrivacyReceiptInsert> {}
