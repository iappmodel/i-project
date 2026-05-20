import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security trust transparency", () => {
  it("lists transparency portals", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-transparency/portals?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-transparency-portals")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists transparency sections", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-transparency/sections?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-transparency-sections")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists published notices", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-transparency/notices?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-transparency-notices")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists published proof status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-transparency/proof-status?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-transparency-proof-status")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists transparency access grants", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-transparency/access-grants?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-transparency-access-grants")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns trust transparency integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-transparency/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-transparency-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("published_portal_count");
    expect(res.body.data).toHaveProperty("published_notice_count");
    expect(res.body.data).toHaveProperty("published_proof_status_count");
  });

  it("validates portal creation body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-trust-transparency/portals")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-transparency-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
