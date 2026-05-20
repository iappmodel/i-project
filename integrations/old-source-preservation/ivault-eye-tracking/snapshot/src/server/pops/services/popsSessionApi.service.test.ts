import { describe, expect, it } from "vitest";
import { PopsSessionApiService } from "./popsSessionApi.service";

describe("PopsSessionApiService idempotency", () => {
  it("ignores duplicate eventId for recordEvents", async () => {
    const service = new PopsSessionApiService({ simulateLatency: false });
    const session = await service.startSession({
      userId: "user-1",
      deviceId: "device-1",
      contentId: "content-1",
      campaignId: "campaign-1",
      sessionType: "REWARD",
      proofLevel: "BASIC",
      requiredDurationMs: 10_000,
    });

    const first = await service.recordEvents(session.sessionId, [
      { eventId: "dup-evt", type: "TOUCH_TAP", timestamp: Date.now() },
    ]);
    const second = await service.recordEvents(session.sessionId, [
      { eventId: "dup-evt", type: "TOUCH_TAP", timestamp: Date.now() },
    ]);

    expect(first.accepted).toBe(1);
    expect(second.accepted).toBe(0);
    expect(second.ignoredDuplicates).toBe(1);
  });

  it("returns same completion output and prevents duplicate wallet intents", async () => {
    const service = new PopsSessionApiService({ simulateLatency: false });
    const session = await service.startSession({
      userId: "user-2",
      deviceId: "device-2",
      contentId: "content-2",
      campaignId: "campaign-2",
      sessionType: "REWARD",
      proofLevel: "BASIC",
      requiredDurationMs: 5_000,
    });

    await service.recordEvents(session.sessionId, [
      { eventId: "evt-1", type: "SESSION_STARTED", timestamp: Date.now() },
      { eventId: "evt-2", type: "CONTENT_PROGRESS", payload: { progressPct: 100 }, timestamp: Date.now() + 6000 },
    ]);
    await service.recordSignalBatch(session.sessionId, {
      batchId: "batch-1",
      signals: [{ type: "CONTENT_PROGRESS", timestamp: Date.now(), value: 100 }],
    });

    const first = await service.completeSession(session.sessionId);
    const second = await service.completeSession(session.sessionId);

    expect(second.rewardDecision.id).toBe(first.rewardDecision.id);
    expect(second.walletIntent?.id).toBe(first.walletIntent?.id);
    expect(service.sessions.walletIntents.size).toBeLessThanOrEqual(1);
  });
});
