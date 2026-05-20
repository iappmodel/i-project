import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin role management", () => {
  it("lists admin roles", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/roles")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);

    const roleKeys = res.body.data.items.map(
      (role: any) => role.role_key ?? role.roleKey
    );

    expect(roleKeys).toContain("super_admin");
  });

  it("lists admin users", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/users?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("rejects role assignment without valid role key", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/users/roles/assign")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        targetAuthUserId: process.env.TEST_USER_ID!,
        roleKey: "god_mode",
        reason: "bad test"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
