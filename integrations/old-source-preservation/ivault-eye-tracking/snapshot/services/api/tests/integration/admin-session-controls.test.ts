import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin session controls", () => {
  it("lists admin session controls", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/session-controls?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-session-controls-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates invalid status filter", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/session-controls?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-session-controls-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates revoke body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security/sessions/revoke")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-session-controls-revoke-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates complete reauth body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security/sessions/complete-reauth")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-session-controls-complete-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
