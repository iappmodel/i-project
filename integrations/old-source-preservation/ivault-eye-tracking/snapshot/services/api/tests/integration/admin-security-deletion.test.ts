import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security deletion", () => {
  it("lists deletion requests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-deletion?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-deletion-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns deletion integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-deletion/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-deletion-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_deletion_request_count");
    expect(res.body.data).toHaveProperty("approved_deletion_request_count");
    expect(res.body.data).toHaveProperty("failed_deletion_request_count");
    expect(res.body.data).toHaveProperty("executed_deletion_request_count_30d");
  });

  it("validates create deletion request body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-deletion")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-deletion-create-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates invalid deletion request status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-deletion?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-deletion-invalid-status")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates approve deletion request body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-deletion/00000000-0000-0000-0000-000000000000/approve")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-deletion-approve-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
