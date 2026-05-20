import type { PopsQueuedEnvelope, PopsSdkSessionEvent } from "./pops-client.types";
import { PopsStorage } from "./pops-storage";

export type PopsOfflineQueueConfig = {
  maxQueueSizePerSession: number;
  queueTtlMs: number;
  now: () => number;
  randomId: () => string;
};

const STORAGE_KEY = "offline_queue_v1";

export class PopsOfflineQueue {
  constructor(
    private readonly storage: PopsStorage,
    private readonly config: PopsOfflineQueueConfig,
  ) {}

  async enqueue(sessionId: string, event: PopsSdkSessionEvent, dedupeKey: string): Promise<PopsQueuedEnvelope[]> {
    const queue = await this.load();
    const now = this.config.now();
    const filtered = this.prune(queue, now);
    if (filtered.some((item) => item.dedupeKey === dedupeKey)) {
      return filtered.filter((item) => item.sessionId === sessionId);
    }

    const sessionItems = filtered.filter((item) => item.sessionId === sessionId);
    if (sessionItems.length >= this.config.maxQueueSizePerSession) {
      const firstIndex = filtered.findIndex((item) => item.sessionId === sessionId);
      if (firstIndex >= 0) filtered.splice(firstIndex, 1);
    }

    filtered.push({
      id: this.config.randomId(),
      dedupeKey,
      sessionId,
      createdAtMs: now,
      expiresAtMs: now + this.config.queueTtlMs,
      attempts: 0,
      event,
    });
    await this.persist(filtered);
    return filtered.filter((item) => item.sessionId === sessionId);
  }

  async getSessionEvents(sessionId: string): Promise<PopsQueuedEnvelope[]> {
    const queue = await this.load();
    const pruned = this.prune(queue, this.config.now());
    if (pruned.length !== queue.length) await this.persist(pruned);
    return pruned.filter((item) => item.sessionId === sessionId);
  }

  async removeByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const queue = await this.load();
    const next = queue.filter((item) => !ids.includes(item.id));
    await this.persist(next);
  }

  async incrementAttempts(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const queue = await this.load();
    const next = queue.map((item) => (ids.includes(item.id) ? { ...item, attempts: item.attempts + 1 } : item));
    await this.persist(next);
  }

  async clearSession(sessionId: string): Promise<void> {
    const queue = await this.load();
    await this.persist(queue.filter((item) => item.sessionId !== sessionId));
  }

  private async load(): Promise<PopsQueuedEnvelope[]> {
    return this.storage.readJson<PopsQueuedEnvelope[]>(STORAGE_KEY, []);
  }

  private async persist(queue: PopsQueuedEnvelope[]): Promise<void> {
    await this.storage.writeJson(STORAGE_KEY, queue);
  }

  private prune(queue: PopsQueuedEnvelope[], now: number): PopsQueuedEnvelope[] {
    return queue.filter((item) => item.expiresAtMs > now);
  }
}
