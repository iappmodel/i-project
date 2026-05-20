import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security proof qr", () => {
  it("lists proof verification links", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-qr/links?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-qr-links")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists proof qr codes", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-qr/qr-codes?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-qr-codes")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists proof qr jobs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-qr/jobs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-qr-jobs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists proof link events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-qr/events?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-qr-events")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns proof qr integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-qr/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-qr-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_link_count");
    expect(res.body.data).toHaveProperty("ready_qr_count");
    expect(res.body.data).toHaveProperty("active_link_missing_hash_count");
  });

  it("validates create link body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-proof-qr/links")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-qr-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
