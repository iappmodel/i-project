import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin alert email provider", () => {
  it("returns delivery config status without exposing secrets", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-deliveries/config")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.email).toHaveProperty("provider");
    expect(res.body.data.email).toHaveProperty("dryRun");
    expect(res.body.data.email).toHaveProperty("httpApiKeyConfigured");

    expect(JSON.stringify(res.body.data)).not.toContain(
      process.env.ADMIN_ALERT_EMAIL_HTTP_API_KEY ?? "never-match-this"
    );
  });

  it("runs provider delivery worker with email adapter available", async () => {
    const res = await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "admin_security_alert_provider_delivery_every_minute",
        lockedBy: "email_provider_integration_test"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("scannedCount");
    expect(res.body.data).toHaveProperty("deliveredCount");
    expect(res.body.data).toHaveProperty("failedCount");
  });
});
