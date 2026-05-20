import type {
  InMemoryPopsEvent,
  InMemoryPopsSignalBatch,
} from "./inMemoryPopsSession.repository";

export class InMemoryPopsEventRepository {
  readonly events = new Map<string, InMemoryPopsEvent[]>();
  readonly signalBatches = new Map<string, InMemoryPopsSignalBatch[]>();
  private readonly eventIdsBySession = new Map<string, Set<string>>();
  private readonly batchIdsBySession = new Map<string, Set<string>>();

  addEvent(event: InMemoryPopsEvent): { inserted: boolean } {
    const eventIds = this.eventIdsBySession.get(event.sessionId) ?? new Set<string>();
    if (eventIds.has(event.eventId)) {
      return { inserted: false };
    }
    eventIds.add(event.eventId);
    this.eventIdsBySession.set(event.sessionId, eventIds);
    const sessionEvents = this.events.get(event.sessionId) ?? [];
    sessionEvents.push(event);
    this.events.set(event.sessionId, sessionEvents);
    return { inserted: true };
  }

  addSignalBatch(batch: InMemoryPopsSignalBatch): { inserted: boolean } {
    const batchIds = this.batchIdsBySession.get(batch.sessionId) ?? new Set<string>();
    if (batchIds.has(batch.batchId)) {
      return { inserted: false };
    }
    batchIds.add(batch.batchId);
    this.batchIdsBySession.set(batch.sessionId, batchIds);
    const sessionBatches = this.signalBatches.get(batch.sessionId) ?? [];
    sessionBatches.push(batch);
    this.signalBatches.set(batch.sessionId, sessionBatches);
    return { inserted: true };
  }

  getEvents(sessionId: string): InMemoryPopsEvent[] {
    return [...(this.events.get(sessionId) ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  }

  getSignalBatches(sessionId: string): InMemoryPopsSignalBatch[] {
    return [...(this.signalBatches.get(sessionId) ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  }
}
