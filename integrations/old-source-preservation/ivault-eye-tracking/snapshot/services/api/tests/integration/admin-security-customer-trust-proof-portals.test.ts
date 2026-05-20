import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security customer trust proof portals", () => {
  it("lists portals", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-customer-trust-proof-portals?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-portals")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists portal sessions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-customer-trust-proof-portals/sessions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-portal-sessions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists portal events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-customer-trust-proof-portals/events?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-portal-events")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns portal integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-customer-trust-proof-portals/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-portal-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_portal_count");
    expect(res.body.data).toHaveProperty("active_portal_session_count");
    expect(res.body.data).toHaveProperty("portal_event_count_24h");
  });

  it("validates private room portal creation", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-customer-trust-proof-portals/private-room")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-portal-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
