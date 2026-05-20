import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin privileged action execution", () => {
  it("lists privileged actions and supports validation on approval", async () => {
    const admin = await getAdminUserToken();

    const list = await api()
      .get("/v1/admin/privileged-actions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(list.body.ok).toBe(true);
    expect(Array.isArray(list.body.data.items)).toBe(true);

    const bad = await api()
      .post("/v1/admin/privileged-actions/not-a-uuid/approve")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        approvalNote: "bad"
      })
      .expect(400);

    expect(bad.body.ok).toBe(false);
    expect(bad.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("reject endpoint validates body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/privileged-actions/00000000-0000-0000-0000-000000000000/reject")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
