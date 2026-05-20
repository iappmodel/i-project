import { PopsClient } from "./pops-client";

export async function runFeedMomentExample(): Promise<void> {
  const pops = new PopsClient({
    appVersion: "1.0.0",
    apiBaseUrl: "https://api.example.com",
    authToken: "replace_me",
  });

  const handle = await pops.startMoment({
    userId: "user_123",
    deviceId: "device_a",
    contentId: "feed_post_456",
    campaignId: "campaign_789",
    sessionType: "feed",
    proofLevel: "attention",
    requiredDurationMs: 20_000,
    expectedReward: { amountMinor: 25, currency: "ICOIN" },
    privacyMode: "balanced",
  });

  handle.subscribe((snapshot) => {
    if (snapshot.state === "degraded") {
      // UI can show "verifying in low connectivity mode"
    }
  });

  await handle.recordProgress(35, 7_000);
  await handle.recordSignal({ signalType: "screen_active", value: true });
  await handle.recordEvent("cta_visible");
  await handle.checkpoint();
  await handle.complete();
}
