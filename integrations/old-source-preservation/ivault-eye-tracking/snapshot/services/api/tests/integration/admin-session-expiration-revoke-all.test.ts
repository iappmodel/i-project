import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin session expiration and revoke-all", () => {
  it("returns admin session integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security/session-controls/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-session-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_session_count");
    expect(res.body.data).toHaveProperty("reauth_required_session_count");
    expect(res.body.data).toHaveProperty("revoked_session_count_24h");
    expect(res.body.data).toHaveProperty("expired_session_count_24h");
    expect(res.body.data).toHaveProperty("idle_active_session_count");
  });

  it("validates revoke-all body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security/sessions/revoke-all")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-revoke-all-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
