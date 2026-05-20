import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken, getPrimaryUserToken } from "../setup/test-users";

describe("admin RBAC", () => {
  it("rejects admin endpoint without bearer token", async () => {
    const res = await api().get("/v1/admin/system").expect(401);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects non-admin user token", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/admin/system")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("PERMISSION_DENIED");
  });

  it("returns admin profile for admin token", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/me")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("auth_user_id");
    expect(res.body.data).toHaveProperty("roles");
    expect(res.body.data).toHaveProperty("permissions");
  });

  it("allows admin system read with valid permission", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/system")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("systemStatus");
  });
});
