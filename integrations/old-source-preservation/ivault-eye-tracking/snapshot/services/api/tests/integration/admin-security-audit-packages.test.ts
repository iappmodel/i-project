import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security audit packages", () => {
  it("lists audit package requests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-packages/requests?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-package-requests")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists audit packages", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-packages/packages?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-packages")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists audit package items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-packages/items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-package-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists audit package access grants", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-packages/access-grants?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-package-access-grants")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns audit package integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-packages/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-package-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_request_count");
    expect(res.body.data).toHaveProperty("ready_package_count");
    expect(res.body.data).toHaveProperty("active_access_grant_count");
  });

  it("validates audit package request body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-audit-packages/requests")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-package-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
