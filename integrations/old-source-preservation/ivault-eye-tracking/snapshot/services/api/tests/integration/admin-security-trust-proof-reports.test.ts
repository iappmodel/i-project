import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security trust proof reports", () => {
  it("lists reports", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-proof-reports?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-proof-reports")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists report sections", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-proof-reports/sections?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-proof-report-sections")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists report items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-proof-reports/items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-proof-report-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists report files", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-proof-reports/files?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-proof-report-files")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists report jobs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-proof-reports/jobs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-proof-report-jobs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns report integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-proof-reports/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-proof-report-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("ready_report_count");
    expect(res.body.data).toHaveProperty("unsafe_raw_artifact_report_count");
    expect(res.body.data).toHaveProperty("ready_missing_hash_count");
  });

  it("validates create report body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-trust-proof-reports")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-proof-report-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
