import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin corrective actions", () => {
  it("lists corrective actions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/corrective-actions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-corrective-action-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns corrective action integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/corrective-actions/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-corrective-action-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("open_corrective_action_count");
    expect(res.body.data).toHaveProperty("overdue_corrective_action_count");
    expect(res.body.data).toHaveProperty("open_critical_corrective_action_count");
    expect(res.body.data).toHaveProperty("completed_corrective_action_count_24h");
    expect(res.body.data).toHaveProperty("open_reviews_without_corrective_actions_count");
  });

  it("validates create corrective action body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/corrective-actions")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-corrective-action-create-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates complete corrective action body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/corrective-actions/00000000-0000-0000-0000-000000000000/complete")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-corrective-action-complete-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
