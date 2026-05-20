import { describe, expect, it } from "vitest";
import { PopsClient } from "./pops-client";
import type { PopsClientConfig, PopsNetworkAdapter, PopsSdkSessionEvent, PopsStartMomentInput } from "./pops-client.types";

class FakeNetwork implements PopsNetworkAdapter {
  public sentEvents: PopsSdkSessionEvent[] = [];
  public online = true;

  async startMoment() {
    if (!this.online) throw new Error("offline");
    return { sessionId: "srv_session_1", serverTimeMs: 2_000 };
  }
  async sendEvents(_sessionId: string, events: PopsSdkSessionEvent[]) {
    if (!this.online) throw new Error("offline");
    this.sentEvents.push(...events);
    return { acceptedCount: events.length, serverTimeMs: 2_100 };
  }
  async checkpoint() {
    if (!this.online) throw new Error("offline");
    return { checkpointId: "cp_1" };
  }
  async completeMoment() {
    if (!this.online) throw new Error("offline");
    return { status: "completed" as const, rewardDecision: "approved" as const };
  }
  async cancelMoment() {
    return { cancelled: true as const };
  }
  async getMomentStatus(sessionId: string) {
    return {
      sessionId,
      state: "completed" as const,
      syncedEvents: this.sentEvents.length,
      pendingEvents: 0,
      rewardDecision: "approved" as const,
      rewardAmountMinor: 100,
      rewardCurrency: "ICOIN" as const,
      updatedAtMs: 3_000,
    };
  }
  async getPrivacyReceipt(sessionId: string) {
    return {
      id: "privacy_1",
      sessionId,
      policyVersion: "v1",
      dataCategories: ["derived_attention_signals"],
      privacyFlags: ["no_raw_camera"],
      createdAtMs: 3_100,
    };
  }
}

function input(): PopsStartMomentInput {
  return {
    userId: "u1",
    deviceId: "d1",
    contentId: "c1",
    campaignId: "cmp1",
    sessionType: "feed",
    proofLevel: "attention",
    requiredDurationMs: 10_000,
    expectedReward: { amountMinor: 10, currency: "ICOIN" },
    privacyMode: "strict",
  };
}

describe("PopsClient", () => {
  it("starts a moment and emits queued events", async () => {
    const fake = new FakeNetwork();
    const events: string[] = [];
    const pops = new PopsClient({
      appVersion: "1.0.0",
      apiBaseUrl: "https://example.test",
      networkAdapter: fake,
      onEvent: (event) => events.push(event.type),
      flushIntervalMs: 20,
      batchSize: 10,
      maxRetries: 0,
      retryBaseDelayMs: 1,
      queueTtlMs: 10_000,
      maxQueueSizePerSession: 100,
    } satisfies PopsClientConfig);

    const handle = await pops.startMoment(input());
    await handle.recordProgress(25, 1_000);
    await handle.recordSignal({ signalType: "screen_active", value: true });
    await handle.recordEvent("cta_visible");
    await handle.checkpoint();
    await handle.complete();

    expect(handle.state === "completed" || handle.state === "pending_sync").toBe(true);
    expect(fake.sentEvents.length).toBeGreaterThan(0);
    expect(events).toContain("session_started");
    expect(events).toContain("event_buffered");
    expect(events).toContain("event_flushed");
  });

  it("keeps completion in pending_sync while offline", async () => {
    const fake = new FakeNetwork();
    const pops = new PopsClient({
      appVersion: "1.0.0",
      apiBaseUrl: "https://example.test",
      networkAdapter: fake,
      flushIntervalMs: 20,
      batchSize: 10,
      maxRetries: 0,
      retryBaseDelayMs: 1,
      queueTtlMs: 10_000,
      maxQueueSizePerSession: 100,
    });
    const handle = await pops.startMoment(input());
    await handle.recordProgress(100, 10_000);
    fake.online = false;
    await handle.complete();
    expect(handle.state).toBe("pending_sync");
  });
});
