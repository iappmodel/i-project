import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin break-glass", () => {
  it("lists break-glass requests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/break-glass?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-break-glass-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns break-glass integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/break-glass/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-break-glass-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("open_break_glass_request_count");
    expect(res.body.data).toHaveProperty("active_break_glass_access_count");
    expect(res.body.data).toHaveProperty("break_glass_request_count_24h");
    expect(res.body.data).toHaveProperty("expired_unprocessed_break_glass_count");
  });

  it("validates create break-glass body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/break-glass")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-break-glass-create-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates execute token body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/break-glass/00000000-0000-0000-0000-000000000000/execute")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-break-glass-execute-body")
      .send({
        token: "too-short"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
