import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

describe("email alert security", () => {
  it("rejects non-allowlisted recipient", async () => {
    process.env.ADMIN_ALERT_EMAIL_ALLOWED_RECIPIENTS = "security@example.com";
    process.env.ADMIN_ALERT_EMAIL_ALLOWED_DOMAINS = "";

    const { assertAllowedEmailRecipient } = await import(
      "../../src/modules/admin-alert-delivery/adapters/email/email.security"
    );

    expect(() =>
      assertAllowedEmailRecipient("attacker@example.net")
    ).toThrow("email target is not allowlisted");
  });

  it("allows explicitly allowlisted recipient", async () => {
    process.env.ADMIN_ALERT_EMAIL_ALLOWED_RECIPIENTS = "security@example.com";
    process.env.ADMIN_ALERT_EMAIL_ALLOWED_DOMAINS = "";

    const { assertAllowedEmailRecipient } = await import(
      "../../src/modules/admin-alert-delivery/adapters/email/email.security"
    );

    expect(assertAllowedEmailRecipient("Security@Example.com")).toBe(
      "security@example.com"
    );
  });

  it("allows allowlisted domain", async () => {
    process.env.ADMIN_ALERT_EMAIL_ALLOWED_RECIPIENTS = "";
    process.env.ADMIN_ALERT_EMAIL_ALLOWED_DOMAINS = "example.com";

    const { assertAllowedEmailRecipient } = await import(
      "../../src/modules/admin-alert-delivery/adapters/email/email.security"
    );

    expect(assertAllowedEmailRecipient("ops@example.com")).toBe(
      "ops@example.com"
    );
  });
});
