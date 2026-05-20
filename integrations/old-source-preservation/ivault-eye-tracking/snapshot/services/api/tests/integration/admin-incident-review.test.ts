import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin incident reviews", () => {
  it("lists incident reviews", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/incident-reviews?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-incident-review-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns incident review integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/incident-reviews/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-incident-review-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("open_incident_review_count");
    expect(res.body.data).toHaveProperty("overdue_incident_review_count");
    expect(res.body.data).toHaveProperty("open_critical_incident_review_count");
    expect(res.body.data).toHaveProperty("closed_incident_review_count_24h");
  });

  it("validates invalid review query", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/incident-reviews?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-incident-review-invalid-query")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates close body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/incident-reviews/00000000-0000-0000-0000-000000000000/close")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-incident-review-close-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
