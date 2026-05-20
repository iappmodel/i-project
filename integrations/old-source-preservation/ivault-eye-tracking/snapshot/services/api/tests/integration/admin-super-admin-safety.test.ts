import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin super-admin safety", () => {
  it("lists privileged admin action requests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/privileged-actions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists admin security alerts", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alerts?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("rejects invalid privileged action query status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/privileged-actions?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
