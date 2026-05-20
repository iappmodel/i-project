import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin MFA factor management", () => {
  it("lists my MFA factors", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/mfa/factors")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates factor id params", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/mfa/factors/not-a-uuid/disable")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        reason: "bad"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates factor action body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/mfa/factors/00000000-0000-0000-0000-000000000000/revoke")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
