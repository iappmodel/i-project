import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security disclosure packages", () => {
  it("lists disclosure packages", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-disclosure-packages?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-packages-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists disclosure package items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-disclosure-packages/items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-package-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns disclosure package integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-disclosure-packages/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-package-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_package_count");
    expect(res.body.data).toHaveProperty("active_package_missing_hash_count");
    expect(res.body.data).toHaveProperty("verification_attempt_count_24h");
  });

  it("validates create disclosure package body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-disclosure-packages")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-package-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
