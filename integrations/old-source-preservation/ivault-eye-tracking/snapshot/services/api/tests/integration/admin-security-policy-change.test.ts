import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security policy change control", () => {
  it("lists policy change requests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-change-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns policy change integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-change-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("draft_change_request_count");
    expect(res.body.data).toHaveProperty("submitted_change_request_count");
    expect(res.body.data).toHaveProperty("approved_change_request_count");
    expect(res.body.data).toHaveProperty("open_critical_change_request_count");
  });

  it("lists policy change reviews", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes/reviews?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-change-reviews")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates create policy change body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-policy-changes")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-change-create-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates invalid policy change query", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-change-invalid-query")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
