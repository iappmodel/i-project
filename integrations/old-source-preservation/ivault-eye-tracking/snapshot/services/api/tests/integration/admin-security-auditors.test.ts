import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security auditors", () => {
  it("lists auditors", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditors?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditors-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists auditor grants", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditors/grants")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditors-grants")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists auditor exports", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditors/exports")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditors-exports")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns auditor integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditors/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditors-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_auditor_count");
    expect(res.body.data).toHaveProperty("active_auditor_grant_count");
    expect(res.body.data).toHaveProperty("pending_export_request_count");
  });

  it("validates create auditor body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-auditors")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditors-create-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
