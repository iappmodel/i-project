import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("admin alert provider worker", () => {
  it("rejects provider worker without worker secret", async () => {
    const res = await api()
      .post("/v1/worker/jobs/run")
      .send({
        jobKey: "admin_security_alert_provider_delivery_every_minute",
        lockedBy: "integration_test"
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });

  it("runs provider delivery worker with worker secret", async () => {
    const res = await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "admin_security_alert_provider_delivery_every_minute",
        lockedBy: "integration_test"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("scannedCount");
    expect(res.body.data).toHaveProperty("deliveredCount");
    expect(res.body.data).toHaveProperty("failedCount");
  });
});
