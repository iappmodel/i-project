import { describe, expect, it } from "vitest";
import { api } from "../setup/client";

describe("auth", () => {
  it("rejects wallet summary without auth", async () => {
    const res = await api().get("/v1/wallet/summary").expect(401);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects invalid bearer token", async () => {
    const res = await api()
      .get("/v1/wallet/summary")
      .set("authorization", "Bearer invalid-token")
      .expect(401);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects worker endpoint without worker secret", async () => {
    const res = await api()
      .post("/v1/worker/jobs/run")
      .send({
        jobKey: "observability_snapshot_every_5_minutes",
        lockedBy: "test"
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });

  it("rejects admin endpoint without admin secret", async () => {
    const res = await api().get("/v1/admin/system").expect(403);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });
});
