import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security compliance reports", () => {
  it("lists compliance reports", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-compliance-reports?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-compliance-reports-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists compliance report sections", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-compliance-reports/sections?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-compliance-report-sections")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists compliance report evidence", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-compliance-reports/evidence?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-compliance-report-evidence")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns compliance report integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-compliance-reports/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-compliance-report-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_report_count");
    expect(res.body.data).toHaveProperty("ready_report_count");
    expect(res.body.data).toHaveProperty("ready_unsigned_report_count");
  });

  it("validates request compliance report body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-compliance-reports")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-compliance-report-invalid-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates invalid report query", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-compliance-reports?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-compliance-report-invalid-query")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
