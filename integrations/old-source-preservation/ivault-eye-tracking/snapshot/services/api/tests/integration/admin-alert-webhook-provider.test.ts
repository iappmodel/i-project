import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin alert webhook provider", () => {
  it("returns webhook config status without exposing secret", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-deliveries/config")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.webhook).toHaveProperty("allowedHostCount");
    expect(res.body.data.webhook).toHaveProperty("signingSecretConfigured");
    expect(res.body.data.webhook).toHaveProperty("timeoutMs");

    expect(JSON.stringify(res.body.data)).not.toContain(
      process.env.ADMIN_ALERT_WEBHOOK_SECRET ?? "never-match-this"
    );
  });
});
