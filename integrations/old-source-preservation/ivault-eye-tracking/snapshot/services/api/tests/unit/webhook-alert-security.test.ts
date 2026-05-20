import { describe, expect, it, vi } from "vitest";

describe("webhook alert security", () => {
  it("rejects non-https target", async () => {
    vi.resetModules();

    process.env.ADMIN_ALERT_WEBHOOK_ALLOWED_HOSTS = "hooks.example.com";

    const { assertSafeWebhookTarget } = await import(
      "../../src/modules/admin-alert-delivery/adapters/webhook/webhook.security"
    );

    await expect(
      assertSafeWebhookTarget("http://hooks.example.com/alert")
    ).rejects.toThrow("webhook target must use https");
  });

  it("rejects non-allowlisted host", async () => {
    vi.resetModules();

    process.env.ADMIN_ALERT_WEBHOOK_ALLOWED_HOSTS = "hooks.example.com";

    const { assertSafeWebhookTarget } = await import(
      "../../src/modules/admin-alert-delivery/adapters/webhook/webhook.security"
    );

    await expect(
      assertSafeWebhookTarget("https://evil.example.net/alert")
    ).rejects.toThrow("webhook target host is not allowlisted");
  });

  it("rejects credentials in url", async () => {
    vi.resetModules();

    process.env.ADMIN_ALERT_WEBHOOK_ALLOWED_HOSTS = "hooks.example.com";

    const { assertSafeWebhookTarget } = await import(
      "../../src/modules/admin-alert-delivery/adapters/webhook/webhook.security"
    );

    await expect(
      assertSafeWebhookTarget("https://user:pass@hooks.example.com/alert")
    ).rejects.toThrow("webhook target must not include credentials");
  });
});
