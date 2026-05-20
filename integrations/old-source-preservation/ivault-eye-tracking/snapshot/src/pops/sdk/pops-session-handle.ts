import type {
  PopsSessionListener,
  PopsSessionSnapshot,
  PopsSdkSignalInput,
  PopsSdkState,
  PopsStartMomentInput,
} from "./pops-client.types";

export type PopsHandleController = {
  recordEvent(sessionId: string, eventType: string, payload?: Record<string, unknown>): Promise<void>;
  recordSignal(sessionId: string, signal: PopsSdkSignalInput): Promise<void>;
  recordProgress(sessionId: string, progressPct: number, elapsedMs: number): Promise<void>;
  pause(sessionId: string): Promise<void>;
  resume(sessionId: string): Promise<void>;
  checkpoint(sessionId: string): Promise<void>;
  complete(sessionId: string): Promise<void>;
  cancel(sessionId: string, reason: string): Promise<void>;
  getSnapshot(sessionId: string): PopsSessionSnapshot;
  subscribe(sessionId: string, listener: PopsSessionListener): () => void;
};

export class PopsSessionHandle {
  constructor(
    readonly sessionId: string,
    private readonly controller: PopsHandleController,
    readonly startedWith: PopsStartMomentInput,
  ) {}

  get state(): PopsSdkState {
    return this.controller.getSnapshot(this.sessionId).state;
  }

  recordEvent(eventType: string, payload?: Record<string, unknown>): Promise<void> {
    return this.controller.recordEvent(this.sessionId, eventType, payload);
  }

  recordSignal(signal: PopsSdkSignalInput): Promise<void> {
    return this.controller.recordSignal(this.sessionId, signal);
  }

  recordProgress(progressPct: number, elapsedMs: number): Promise<void> {
    return this.controller.recordProgress(this.sessionId, progressPct, elapsedMs);
  }

  pause(): Promise<void> {
    return this.controller.pause(this.sessionId);
  }

  resume(): Promise<void> {
    return this.controller.resume(this.sessionId);
  }

  checkpoint(): Promise<void> {
    return this.controller.checkpoint(this.sessionId);
  }

  complete(): Promise<void> {
    return this.controller.complete(this.sessionId);
  }

  cancel(reason: string): Promise<void> {
    return this.controller.cancel(this.sessionId, reason);
  }

  subscribe(listener: PopsSessionListener): () => void {
    return this.controller.subscribe(this.sessionId, listener);
  }
}
