import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security risk context", () => {
  it("lists admin security devices", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/devices?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists admin security sessions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/sessions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists admin action risk evaluations", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/action-risks?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("rejects invalid session decision filter", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/sessions?decision=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
