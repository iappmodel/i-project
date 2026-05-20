import { describe, expect, it } from "vitest";
import { InMemoryPopsEventRepository } from "../repositories/inMemoryPopsEvent.repository";
import { InMemoryPopsSessionRepository } from "../repositories/inMemoryPopsSession.repository";
import { PopsCompletionPipelineService } from "./popsCompletionPipeline.service";

describe("PopsCompletionPipelineService", () => {
  it("runs completion pipeline and returns full output", () => {
    const sessions = new InMemoryPopsSessionRepository();
    const events = new InMemoryPopsEventRepository();
    const pipeline = new PopsCompletionPipelineService(sessions, events);

    const session = sessions.createSession({
      userId: "u1",
      deviceId: "d1",
      contentId: "c1",
      campaignId: "campaign-1",
      sessionType: "REWARD",
      proofLevel: "BASIC",
      requiredDurationMs: 30_000,
    });

    events.addEvent({
      eventId: "evt-1",
      sessionId: session.sessionId,
      type: "SESSION_STARTED",
      timestamp: session.startedAt,
    });
    events.addEvent({
      eventId: "evt-2",
      sessionId: session.sessionId,
      type: "CONTENT_PROGRESS",
      timestamp: session.startedAt + 31_000,
      payload: { progressPct: 100 },
    });
    events.addSignalBatch({
      batchId: "batch-1",
      sessionId: session.sessionId,
      createdAt: session.startedAt + 31_000,
      signals: [{ type: "CONTENT_PROGRESS", timestamp: session.startedAt + 31_000, value: 100 }],
    });

    const output = pipeline.completeSession(session.sessionId);

    expect(output.finalState).toBe("COMPLETED");
    expect(output.judgment.sessionId).toBe(session.sessionId);
    expect(output.rewardDecision.sessionId).toBe(session.sessionId);
    expect(output.privacyReceipt.sessionId).toBe(session.sessionId);
    expect(output.walletIntent?.sessionId).toBe(session.sessionId);
    expect(output.checkpoint.progressPct).toBe(100);
  });

  it("returns same final decision for duplicate completion", () => {
    const sessions = new InMemoryPopsSessionRepository();
    const events = new InMemoryPopsEventRepository();
    const pipeline = new PopsCompletionPipelineService(sessions, events);

    const session = sessions.createSession({
      userId: "u2",
      deviceId: "d2",
      contentId: "c2",
      campaignId: "campaign-2",
      sessionType: "REWARD",
      proofLevel: "BASIC",
      requiredDurationMs: 20_000,
    });

    events.addEvent({
      eventId: "evt-a",
      sessionId: session.sessionId,
      type: "CONTENT_PROGRESS",
      timestamp: session.startedAt + 25_000,
      payload: { progressPct: 100 },
    });

    const first = pipeline.completeSession(session.sessionId);
    const second = pipeline.completeSession(session.sessionId);

    expect(second.rewardDecision.id).toBe(first.rewardDecision.id);
    expect(second.judgment.id).toBe(first.judgment.id);
    expect(second.walletIntent?.id).toBe(first.walletIntent?.id);
  });
});
