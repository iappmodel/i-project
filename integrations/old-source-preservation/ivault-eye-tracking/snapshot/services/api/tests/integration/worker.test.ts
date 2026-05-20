import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("worker", () => {
  it("runs allowlisted observability job", async () => {
    const res = await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "observability_snapshot_every_5_minutes",
        lockedBy: "integration_test"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("scheduledJobRunId");
  });

  it("rejects non-allowlisted job key at validation layer", async () => {
    const res = await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "drop_everything",
        lockedBy: "integration_test"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
