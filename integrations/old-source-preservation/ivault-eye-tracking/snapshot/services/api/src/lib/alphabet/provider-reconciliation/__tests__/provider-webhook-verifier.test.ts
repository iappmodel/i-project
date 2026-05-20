import { describe, expect, it } from "vitest";
import { verifyProviderWebhook } from "../provider-webhook-verifier";

describe("provider-webhook-verifier", () => {
  it("auto-verifies mock provider", () => {
    const result = verifyProviderWebhook({
      provider: "mock",
      rawBody: "{}",
      headers: {},
      receivedAt: new Date().toISOString()
    });

    expect(result.verified).toBe(true);
  });

  it("fails missing signature for signed provider", () => {
    const result = verifyProviderWebhook({
      provider: "stripe",
      rawBody: "{}",
      headers: {},
      receivedAt: new Date().toISOString()
    });

    expect(result.verified).toBe(false);
  });
});
