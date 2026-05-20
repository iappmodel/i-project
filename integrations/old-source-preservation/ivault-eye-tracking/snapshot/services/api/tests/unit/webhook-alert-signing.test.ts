import { describe, expect, it } from "vitest";
import { signWebhookPayload } from "../../src/modules/admin-alert-delivery/adapters/webhook/webhook.crypto";

describe("webhook alert signing", () => {
  it("produces stable signature for same input", () => {
    const input = {
      secret: "test-secret",
      timestamp: "1700000000",
      nonce: "abc123",
      body: JSON.stringify({ ok: true })
    };

    const a = signWebhookPayload(input);
    const b = signWebhookPayload(input);

    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes signature when body changes", () => {
    const base = {
      secret: "test-secret",
      timestamp: "1700000000",
      nonce: "abc123"
    };

    const a = signWebhookPayload({
      ...base,
      body: JSON.stringify({ ok: true })
    });

    const b = signWebhookPayload({
      ...base,
      body: JSON.stringify({ ok: false })
    });

    expect(a).not.toBe(b);
  });
});
