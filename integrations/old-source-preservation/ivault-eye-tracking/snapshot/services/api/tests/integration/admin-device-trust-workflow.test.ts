import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin device trust workflow", () => {
  it("lists admin devices", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/devices?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates device id params", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security/devices/not-a-uuid/trust")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        reasonMessage: "bad"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates device action body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security/devices/00000000-0000-0000-0000-000000000000/block")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
