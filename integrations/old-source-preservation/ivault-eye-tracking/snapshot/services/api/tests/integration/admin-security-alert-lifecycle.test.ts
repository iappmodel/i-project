import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security alert lifecycle", () => {
  it("validates alert lifecycle route params", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-alerts/not-a-uuid/acknowledge")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        note: "bad"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates resolve body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-alerts/00000000-0000-0000-0000-000000000000/resolve")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates dismiss body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-alerts/00000000-0000-0000-0000-000000000000/dismiss")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
