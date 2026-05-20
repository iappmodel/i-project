import {
  type PopsClientEvent,
  type PopsSignalBatch,
  IMPORTANT_EVENTS,
} from "./pops-client-events";

type PopsFlushTransport = (payload: {
  events: PopsClientEvent[];
  signalBatches: PopsSignalBatch[];
}) => Promise<void>;

type PopsSignalBufferOptions = {
  transport?: PopsFlushTransport;
  isOnline?: () => boolean;
};

const noopTransport: PopsFlushTransport = async () => undefined;
const onlineByDefault = (): boolean => true;

export class PopsSignalBuffer {
  private events: PopsClientEvent[] = [];
  private signalBatches: PopsSignalBatch[] = [];
  private offlineQueue: { events: PopsClientEvent[]; signalBatches: PopsSignalBatch[] }[] = [];
  private lastFlushAt?: number;
  private readonly transport: PopsFlushTransport;
  private readonly isOnline: () => boolean;

  constructor(options?: PopsSignalBufferOptions) {
    this.transport = options?.transport ?? noopTransport;
    this.isOnline = options?.isOnline ?? onlineByDefault;
  }

  addEvent(event: PopsClientEvent): void {
    this.events.push(event);
    if (IMPORTANT_EVENTS.has(event.type)) {
      void this.flush();
    }
  }

  addSignalBatch(batch: PopsSignalBatch): void {
    this.signalBatches.push(batch);
  }

  async flush(): Promise<void> {
    if (this.events.length === 0 && this.signalBatches.length === 0 && this.offlineQueue.length === 0) {
      return;
    }

    const payload = {
      events: this.events.slice(),
      signalBatches: this.signalBatches.slice(),
    };

    this.events = [];
    this.signalBatches = [];

    if (!this.isOnline()) {
      this.offlineQueue.push(payload);
      return;
    }

    const pending = this.offlineQueue.splice(0);
    try {
      for (const queued of pending) {
        await this.transport(queued);
      }
      if (payload.events.length > 0 || payload.signalBatches.length > 0) {
        await this.transport(payload);
      }
      this.lastFlushAt = Date.now();
    } catch {
      this.offlineQueue = pending.concat(payload);
    }
  }

  clear(): void {
    this.events = [];
    this.signalBatches = [];
    this.offlineQueue = [];
  }

  getPendingCount(): number {
    const bufferedCount = this.events.length + this.signalBatches.length;
    const queuedCount = this.offlineQueue.reduce((total, queued) => {
      return total + queued.events.length + queued.signalBatches.length;
    }, 0);
    return bufferedCount + queuedCount;
  }

  getLastFlushAt(): number | undefined {
    return this.lastFlushAt;
  }
}

