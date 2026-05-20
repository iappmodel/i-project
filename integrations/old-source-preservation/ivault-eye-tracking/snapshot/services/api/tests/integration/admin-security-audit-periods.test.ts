import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security audit periods", () => {
  it("lists audit period exports", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods/exports?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-period-exports")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists audit period export items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods/export-items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-period-export-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns audit period export integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods/exports/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-period-export-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_export_count");
    expect(res.body.data).toHaveProperty("ready_export_count");
    expect(res.body.data).toHaveProperty("failed_export_count");
  });

  it("validates invalid audit period export query", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods/exports?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-period-export-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security audit periods", () => {
  it("lists audit periods", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-periods-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists audit snapshots", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods/snapshots?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-periods-snapshots")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists audit snapshot items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods/snapshot-items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-periods-snapshot-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns audit period integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-periods-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("open_audit_period_count");
    expect(res.body.data).toHaveProperty("closed_unsealed_audit_period_count");
    expect(res.body.data).toHaveProperty("sealed_audit_period_count");
    expect(res.body.data).toHaveProperty("sealed_period_missing_hash_count");
  });

  it("validates create audit period body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-audit-periods")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-periods-create-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates invalid audit period query", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-audit-periods?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-audit-periods-invalid-query")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
