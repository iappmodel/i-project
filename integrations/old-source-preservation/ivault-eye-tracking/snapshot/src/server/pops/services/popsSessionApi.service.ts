import type {
  PopsEventType,
  PopsSession,
  PopsSessionStartInput,
  PopsSignalItem,
} from "../../../pops/capture/pops-client-events";
import { InMemoryPopsEventRepository } from "../repositories/inMemoryPopsEvent.repository";
import { InMemoryPopsSessionRepository } from "../repositories/inMemoryPopsSession.repository";
import type { PopsCompletionOutput } from "../repositories/inMemoryPopsSession.repository";
import type { InMemoryPopsSession } from "../repositories/inMemoryPopsSession.repository";
import { PopsCompletionPipelineService } from "./popsCompletionPipeline.service";

type ApiLikeOptions = {
  simulateLatency?: boolean;
  latencyMs?: number;
};

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

async function maybeDelay(enabled: boolean, latencyMs: number): Promise<void> {
  if (!enabled) return;
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
}

export class PopsSessionApiService {
  readonly sessions = new InMemoryPopsSessionRepository();
  readonly events = new InMemoryPopsEventRepository();
  readonly completion = new PopsCompletionPipelineService(this.sessions, this.events);
  private readonly simulateLatency: boolean;
  private readonly latencyMs: number;

  constructor(options: ApiLikeOptions = {}) {
    this.simulateLatency = options.simulateLatency ?? false;
    this.latencyMs = options.latencyMs ?? 300;
  }

  async startSession(input: PopsSessionStartInput): Promise<PopsSession> {
    await maybeDelay(this.simulateLatency, this.latencyMs);
    const created = this.sessions.createSession(input);
    return {
      sessionId: created.sessionId,
      startedAt: created.startedAt,
      endedAt: created.endedAt,
      userId: created.userId,
      deviceId: created.deviceId,
      contentId: created.contentId,
      campaignId: created.campaignId,
      sessionType: created.sessionType,
      proofLevel: created.proofLevel,
      requiredDurationMs: created.requiredDurationMs,
    };
  }

  async recordEvents(
    sessionId: string,
    events: Array<{ eventId?: string; type: PopsEventType; timestamp?: number; payload?: Record<string, unknown> }>,
  ): Promise<{ accepted: number; ignoredDuplicates: number }> {
    await maybeDelay(this.simulateLatency, this.latencyMs);
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error("session not found");
    if (session.state === "CLOSED") throw new Error("session already closed");

    let accepted = 0;
    let ignoredDuplicates = 0;
    for (const rawEvent of events) {
      if (!rawEvent.type) throw new Error("invalid event");
      const insert = this.events.addEvent({
        eventId: rawEvent.eventId ?? makeId("pops_event"),
        sessionId,
        type: rawEvent.type,
        timestamp: rawEvent.timestamp ?? Date.now(),
        payload: rawEvent.payload,
      });
      if (insert.inserted) accepted += 1;
      else ignoredDuplicates += 1;
    }
    return { accepted, ignoredDuplicates };
  }

  async recordSignalBatch(
    sessionId: string,
    batch: { batchId?: string; createdAt?: number; signals: PopsSignalItem[] },
  ): Promise<{ accepted: boolean }> {
    await maybeDelay(this.simulateLatency, this.latencyMs);
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error("session not found");
    if (session.state === "CLOSED") throw new Error("session already closed");
    const inserted = this.events.addSignalBatch({
      batchId: batch.batchId ?? makeId("pops_batch"),
      sessionId,
      createdAt: batch.createdAt ?? Date.now(),
      signals: batch.signals,
    });
    return { accepted: inserted.inserted };
  }

  async getCheckpoint(sessionId: string) {
    await maybeDelay(this.simulateLatency, this.latencyMs);
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error("session not found");
    return session.checkpoint;
  }

  async completeSession(sessionId: string): Promise<PopsCompletionOutput> {
    await maybeDelay(this.simulateLatency, this.latencyMs);
    return this.completion.completeSession(sessionId);
  }

  async getSessionStatus(sessionId: string): Promise<{
    state: string;
    checkpoint: InMemoryPopsSession["checkpoint"];
    rewardStatus: "pending" | "approved" | "held" | "denied";
  }> {
    await maybeDelay(this.simulateLatency, this.latencyMs);
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error("session not found");
    const rewardStatus = session.finalDecision?.rewardDecision.status.toLowerCase() as
      | "approved"
      | "held"
      | "denied"
      | undefined;
    return {
      state: session.state,
      checkpoint: session.checkpoint,
      rewardStatus: rewardStatus ?? "pending",
    };
  }

  async getPrivacyReceipt(sessionId: string) {
    await maybeDelay(this.simulateLatency, this.latencyMs);
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error("session not found");
    const receipt = this.sessions.getLatestPrivacyReceipt(sessionId);
    if (!receipt) throw new Error("privacy receipt failed");
    return receipt;
  }
}

let defaultApiService: PopsSessionApiService | undefined;

export function getPopsSessionApiService(): PopsSessionApiService {
  if (!defaultApiService) {
    defaultApiService = new PopsSessionApiService({ simulateLatency: true });
  }
  return defaultApiService;
}
