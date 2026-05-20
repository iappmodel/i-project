import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

describe("slack alert security", () => {
  it("rejects non-allowlisted slack channel key", async () => {
    process.env.ADMIN_ALERT_SLACK_ALLOWED_CHANNEL_KEYS = "security_alerts";

    const { assertAllowedSlackChannelKey } = await import(
      "../../src/modules/admin-alert-delivery/adapters/slack/slack.security"
    );

    expect(() => assertAllowedSlackChannelKey("random_channel")).toThrow(
      "slack channel key is not allowlisted"
    );
  });

  it("allows allowlisted channel key with hash prefix", async () => {
    process.env.ADMIN_ALERT_SLACK_ALLOWED_CHANNEL_KEYS = "security_alerts";

    const { assertAllowedSlackChannelKey } = await import(
      "../../src/modules/admin-alert-delivery/adapters/slack/slack.security"
    );

    expect(assertAllowedSlackChannelKey("#security_alerts")).toBe(
      "security_alerts"
    );
  });

  it("rejects invalid slack channel key shape", async () => {
    process.env.ADMIN_ALERT_SLACK_ALLOWED_CHANNEL_KEYS = "security_alerts";

    const { assertAllowedSlackChannelKey } = await import(
      "../../src/modules/admin-alert-delivery/adapters/slack/slack.security"
    );

    expect(() =>
      assertAllowedSlackChannelKey("https://hooks.slack.com/services/evil")
    ).toThrow("invalid slack channel key");
  });
});
