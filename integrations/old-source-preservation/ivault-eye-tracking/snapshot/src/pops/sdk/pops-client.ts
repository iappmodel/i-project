import { PopsDeviceContextCollector } from "./pops-device-context";
import { PopsNetworkClient } from "./pops-network";
import { PopsOfflineQueue } from "./pops-offline-queue";
import { PopsSessionHandle, type PopsHandleController } from "./pops-session-handle";
import { createDefaultStorageAdapter, PopsStorage } from "./pops-storage";
import type {
  PopsCancelReason,
  PopsClientConfig,
  PopsMomentStatus,
  PopsNetworkAdapter,
  PopsPrivacyReceipt,
  PopsRecordContentProgressInput,
  PopsRecordInteractionInput,
  PopsSdkEvent,
  PopsSdkSessionEvent,
  PopsSdkSignalInput,
  PopsSdkState,
  PopsSessionListener,
  PopsSessionSnapshot,
  PopsStartMomentInput,
} from "./pops-client.types";

type SessionRuntime = {
  snapshot: PopsSessionSnapshot;
  listeners: Set<PopsSessionListener>;
  flushTimer?: ReturnType<typeof setInterval>;
  latestDedupeCounter: number;
};

export class PopsClient implements PopsHandleController {
  private readonly now: () => number;
  private readonly randomId: () => string;
  private readonly storage: PopsStorage;
  private readonly queue: PopsOfflineQueue;
  private readonly network: PopsNetworkAdapter;
  private readonly networkInspector?: PopsNetworkClient;
  private readonly contextCollector: PopsDeviceContextCollector;
  private readonly sessions = new Map<string, SessionRuntime>();
  private appForegrounded = true;
  private screenActive = true;
  private lowPowerMode: boolean | undefined;
  private batteryLevelPct: number | undefined;
  private batteryState: "unknown" | "charging" | "discharging" | "full" = "unknown";

  constructor(private readonly config: PopsClientConfig) {
    this.now = config.now ?? (() => Date.now());
    this.randomId = config.randomId ?? (() => `pops_${this.now()}_${Math.random().toString(36).slice(2, 10)}`);
    this.storage = new PopsStorage(config.storage ?? createDefaultStorageAdapter(), "pops_sdk");
    this.queue = new PopsOfflineQueue(this.storage, {
      maxQueueSizePerSession: config.maxQueueSizePerSession ?? 500,
      queueTtlMs: config.queueTtlMs ?? 1000 * 60 * 60 * 24,
      now: this.now,
      randomId: this.randomId,
    });
    if (config.networkAdapter) {
      this.network = config.networkAdapter;
      this.networkInspector = config.networkAdapter instanceof PopsNetworkClient ? config.networkAdapter : undefined;
    } else {
      const net = new PopsNetworkClient(config, this.now);
      this.network = net;
      this.networkInspector = net;
    }
    this.contextCollector = new PopsDeviceContextCollector(config);
  }

  async startMoment(input: PopsStartMomentInput): Promise<PopsSessionHandle> {
    const runtimeState: PopsSdkState = "starting";
    const tentativeSessionId = `local_${this.randomId()}`;
    const runtime = this.createSessionRuntime(tentativeSessionId, input.requiredDurationMs, runtimeState, input.privacyMode);
    this.emit({
      type: "event_buffered",
      sessionId: tentativeSessionId,
      timestampMs: this.now(),
      payload: { stage: "starting" },
    });

    try {
      const context = this.contextCollector.collect({
        appForegrounded: this.appForegrounded,
        screenActive: this.screenActive,
        batteryLevelPct: this.batteryLevelPct,
        batteryState: this.batteryState,
        lowPowerMode: this.lowPowerMode,
      });
      const started = await this.network.startMoment(input, context, { timeoutMs: 12_000 });
      this.sessions.delete(tentativeSessionId);
      runtime.snapshot.sessionId = started.sessionId;
      runtime.snapshot.state = context.lowBatteryMode || context.poorNetworkMode ? "degraded" : "active";
      runtime.snapshot.pendingSync = false;
      this.sessions.set(started.sessionId, runtime);
      this.startFlushLoop(started.sessionId);
      this.notify(started.sessionId);
      this.emit({
        type: "session_started",
        sessionId: started.sessionId,
        timestampMs: this.now(),
        payload: { state: runtime.snapshot.state, clockDriftMs: this.networkInspector?.getClockDriftSample()?.driftMs },
      });
      return new PopsSessionHandle(started.sessionId, this, input);
    } catch (error) {
      runtime.snapshot.state = "failed";
      runtime.snapshot.lastError = error instanceof Error ? error.message : "start_failed";
      this.notify(tentativeSessionId);
      this.emitError(tentativeSessionId, runtime.snapshot.lastError);
      throw error;
    }
  }

  async recordContentProgress(input: PopsRecordContentProgressInput): Promise<void> {
    await this.recordProgress(input.sessionId, input.progressPct, input.elapsedMs);
  }

  async recordInteraction(input: PopsRecordInteractionInput): Promise<void> {
    await this.enqueueEvent(input.sessionId, {
      kind: "interaction",
      interactionType: input.interactionType,
      interactionValue: input.interactionValue,
      metadata: input.metadata,
    });
  }

  async recordCheckpoint(sessionId: string): Promise<void> {
    await this.checkpoint(sessionId);
  }

  async completeMoment(sessionId: string): Promise<void> {
    await this.complete(sessionId);
  }

  async cancelMoment(sessionId: string, reason: PopsCancelReason | string): Promise<void> {
    await this.cancel(sessionId, reason);
  }

  async getMomentStatus(sessionId: string): Promise<PopsMomentStatus> {
    return this.network.getMomentStatus(sessionId);
  }

  async getPrivacyReceipt(sessionId: string): Promise<PopsPrivacyReceipt> {
    const receipt = await this.network.getPrivacyReceipt(sessionId);
    this.emit({
      type: "privacy_receipt_created",
      sessionId,
      timestampMs: this.now(),
      payload: { receiptId: receipt.id },
    });
    return receipt;
  }

  async recordEvent(sessionId: string, eventType: string, payload?: Record<string, unknown>): Promise<void> {
    await this.enqueueEvent(sessionId, {
      kind: "interaction",
      interactionType: eventType,
      metadata: payload,
    });
  }

  async recordSignal(sessionId: string, signal: PopsSdkSignalInput): Promise<void> {
    await this.enqueueEvent(sessionId, {
      kind: "signal",
      signalType: signal.signalType,
      value: signal.value,
      metadata: signal.metadata,
    });
  }

  async recordProgress(sessionId: string, progressPct: number, elapsedMs: number): Promise<void> {
    const runtime = this.mustGetSession(sessionId);
    runtime.snapshot.progressPct = Math.max(runtime.snapshot.progressPct, Math.min(100, progressPct));
    runtime.snapshot.rewardProgressPct = runtime.snapshot.progressPct;
    this.notify(sessionId, {
      type: "reward_progress_updated",
      sessionId,
      timestampMs: this.now(),
      payload: { progressPct: runtime.snapshot.progressPct },
    });
    await this.enqueueEvent(sessionId, {
      kind: "progress",
      progressPct: runtime.snapshot.progressPct,
      elapsedMs,
    });
  }

  async pause(sessionId: string): Promise<void> {
    const runtime = this.mustGetSession(sessionId);
    runtime.snapshot.state = "paused";
    this.notify(sessionId);
    await this.enqueueEvent(sessionId, { kind: "control", action: "pause" });
  }

  async resume(sessionId: string): Promise<void> {
    const runtime = this.mustGetSession(sessionId);
    runtime.snapshot.state = "active";
    this.notify(sessionId);
    await this.enqueueEvent(sessionId, { kind: "control", action: "resume" });
  }

  async checkpoint(sessionId: string): Promise<void> {
    const runtime = this.mustGetSession(sessionId);
    await this.flushSession(sessionId);
      const checkpoint = await this.network.checkpoint(sessionId);
    this.notify(sessionId, {
      type: "checkpoint_received",
      sessionId,
      timestampMs: this.now(),
      payload: { checkpointId: checkpoint.checkpointId },
    });
    runtime.snapshot.pendingSync = false;
  }

  async complete(sessionId: string): Promise<void> {
    const runtime = this.mustGetSession(sessionId);
    runtime.snapshot.state = "completing";
    this.notify(sessionId);
    await this.enqueueEvent(sessionId, { kind: "control", action: "complete" });
    const flushed = await this.flushSession(sessionId);
    if (!flushed) {
      runtime.snapshot.state = "pending_sync";
      runtime.snapshot.pendingSync = true;
      this.notify(sessionId, {
        type: "session_degraded",
        sessionId,
        timestampMs: this.now(),
        payload: { reason: "offline_completion_pending_sync" },
      });
      return;
    }
    const completion = await this.network.completeMoment(sessionId);
    runtime.snapshot.state = completion.status === "completed" ? "completed" : "pending_sync";
    runtime.snapshot.pendingSync = completion.status !== "completed";
    this.notify(sessionId, {
      type: "session_completed",
      sessionId,
      timestampMs: this.now(),
      payload: { state: runtime.snapshot.state },
    });
    if (completion.rewardDecision) {
      this.notify(sessionId, {
        type: "reward_decision_received",
        sessionId,
        timestampMs: this.now(),
        payload: { rewardDecision: completion.rewardDecision },
      });
    }
  }

  async cancel(sessionId: string, reason: string): Promise<void> {
    const runtime = this.mustGetSession(sessionId);
    await this.enqueueEvent(sessionId, { kind: "control", action: "cancel", reason });
    await this.flushSession(sessionId);
    await this.network.cancelMoment(sessionId, reason);
    runtime.snapshot.state = "cancelled";
    runtime.snapshot.pendingSync = false;
    await this.queue.clearSession(sessionId);
    this.notify(sessionId);
    this.stopFlushLoop(sessionId);
  }

  getSnapshot(sessionId: string): PopsSessionSnapshot {
    return this.mustGetSession(sessionId).snapshot;
  }

  subscribe(sessionId: string, listener: PopsSessionListener): () => void {
    const runtime = this.mustGetSession(sessionId);
    runtime.listeners.add(listener);
    listener(runtime.snapshot);
    return () => {
      runtime.listeners.delete(listener);
    };
  }

  async onAppBackground(): Promise<void> {
    this.appForegrounded = false;
    for (const sessionId of this.sessions.keys()) {
      await this.flushSession(sessionId);
    }
  }

  async onAppForeground(): Promise<void> {
    this.appForegrounded = true;
    for (const [sessionId, runtime] of this.sessions) {
      const context = this.contextCollector.collect({
        appForegrounded: true,
        screenActive: this.screenActive,
        batteryLevelPct: this.batteryLevelPct,
        batteryState: this.batteryState,
        lowPowerMode: this.lowPowerMode,
      });
      if (context.lowBatteryMode || context.poorNetworkMode) {
        runtime.snapshot.state = "degraded";
        this.notify(sessionId, {
          type: "session_degraded",
          sessionId,
          timestampMs: this.now(),
          payload: {
            lowBatteryMode: context.lowBatteryMode,
            poorNetworkMode: context.poorNetworkMode,
          },
        });
      } else if (runtime.snapshot.state === "degraded") {
        runtime.snapshot.state = "active";
        this.notify(sessionId, {
          type: "confidence_updated",
          sessionId,
          timestampMs: this.now(),
          payload: { resumedFromDegraded: true },
        });
      }
      await this.flushSession(sessionId);
    }
  }

  setBatteryContext(input: {
    levelPct?: number;
    state?: "unknown" | "charging" | "discharging" | "full";
    lowPowerMode?: boolean;
  }): void {
    this.batteryLevelPct = input.levelPct;
    if (input.state) this.batteryState = input.state;
    this.lowPowerMode = input.lowPowerMode;
  }

  setScreenActive(active: boolean): void {
    this.screenActive = active;
  }

  private async enqueueEvent(sessionId: string, event: PopsSdkSessionEvent): Promise<void> {
    const runtime = this.mustGetSession(sessionId);
    const dedupeKey = `${sessionId}:${runtime.latestDedupeCounter}:${JSON.stringify(event)}`;
    runtime.latestDedupeCounter += 1;
    const queued = await this.queue.enqueue(sessionId, event, dedupeKey);
    runtime.snapshot.pendingSync = queued.length > 0;
    this.notify(sessionId, {
      type: "event_buffered",
      sessionId,
      timestampMs: this.now(),
      payload: { queuedCount: queued.length },
    });
    void this.flushSession(sessionId);
  }

  private async flushSession(sessionId: string): Promise<boolean> {
    const runtime = this.mustGetSession(sessionId);
    const queued = await this.queue.getSessionEvents(sessionId);
    if (queued.length === 0) {
      runtime.snapshot.pendingSync = false;
      return true;
    }

    const context = this.contextCollector.collect({
      appForegrounded: this.appForegrounded,
      screenActive: this.screenActive,
      batteryLevelPct: this.batteryLevelPct,
      batteryState: this.batteryState,
      lowPowerMode: this.lowPowerMode,
    });
    if (context.poorNetworkMode) {
      runtime.snapshot.state = "degraded";
      this.notify(sessionId, {
        type: "session_degraded",
        sessionId,
        timestampMs: this.now(),
        payload: { reason: "poor_network_mode" },
      });
      return false;
    }

    const batchSize = this.config.batchSize ?? 25;
    const chunk = queued.slice(0, batchSize);
    try {
      const response = await this.network.sendEvents(sessionId, chunk.map((item) => item.event));
      await this.queue.removeByIds(chunk.map((item) => item.id));
      runtime.snapshot.pendingSync = (await this.queue.getSessionEvents(sessionId)).length > 0;
      this.notify(sessionId, {
        type: "event_flushed",
        sessionId,
        timestampMs: this.now(),
        payload: { acceptedCount: response.acceptedCount, pendingSync: runtime.snapshot.pendingSync },
      });
      return true;
    } catch (error) {
      await this.queue.incrementAttempts(chunk.map((item) => item.id));
      runtime.snapshot.pendingSync = true;
      runtime.snapshot.state = runtime.snapshot.state === "completing" ? "pending_sync" : "degraded";
      runtime.snapshot.lastError = error instanceof Error ? error.message : "flush_failed";
      this.notify(sessionId, {
        type: "session_degraded",
        sessionId,
        timestampMs: this.now(),
        payload: { reason: runtime.snapshot.lastError },
      });
      return false;
    }
  }

  private createSessionRuntime(
    sessionId: string,
    requiredDurationMs: number,
    state: PopsSdkState,
    privacyMode: string,
  ): SessionRuntime {
    const runtime: SessionRuntime = {
      snapshot: {
        sessionId,
        state,
        startedAtMs: this.now(),
        requiredDurationMs,
        progressPct: 0,
        rewardProgressPct: 0,
        pendingSync: false,
        privacyFlags: this.getPrivacyFlags(privacyMode),
      },
      listeners: new Set<PopsSessionListener>(),
      latestDedupeCounter: 0,
    };
    this.sessions.set(sessionId, runtime);
    return runtime;
  }

  private getPrivacyFlags(privacyMode: string): string[] {
    const base = ["no_raw_camera", "no_raw_microphone", "no_contacts"];
    if (privacyMode === "strict") return [...base, "no_precise_location"];
    if (privacyMode === "campaign_required") return [...base, "location_requires_explicit_consent"];
    return base;
  }

  private startFlushLoop(sessionId: string): void {
    const runtime = this.mustGetSession(sessionId);
    this.stopFlushLoop(sessionId);
    runtime.flushTimer = setInterval(() => {
      void this.flushSession(sessionId);
    }, this.config.flushIntervalMs ?? 2_000);
  }

  private stopFlushLoop(sessionId: string): void {
    const runtime = this.sessions.get(sessionId);
    if (runtime?.flushTimer) {
      clearInterval(runtime.flushTimer);
      runtime.flushTimer = undefined;
    }
  }

  private mustGetSession(sessionId: string): SessionRuntime {
    const runtime = this.sessions.get(sessionId);
    if (!runtime) {
      throw new Error(`unknown_session:${sessionId}`);
    }
    return runtime;
  }

  private notify(sessionId: string, event?: PopsSdkEvent): void {
    const runtime = this.mustGetSession(sessionId);
    runtime.listeners.forEach((listener) => listener(runtime.snapshot, event));
    if (event) this.emit(event);
  }

  private emit(event: PopsSdkEvent): void {
    this.config.onEvent?.(event);
  }

  private emitError(sessionId: string, message: string): void {
    this.emit({
      type: "error",
      sessionId,
      timestampMs: this.now(),
      payload: { message },
    });
  }
}
