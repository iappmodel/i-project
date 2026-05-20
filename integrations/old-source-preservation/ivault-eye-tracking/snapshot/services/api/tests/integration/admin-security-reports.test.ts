import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security reports", () => {
  it("lists daily snapshots", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-reports/snapshots?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-reports-snapshots")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns snapshot/report integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-reports/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-reports-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("snapshot_count_30d");
    expect(res.body.data).toHaveProperty("critical_snapshot_count_30d");
    expect(res.body.data).toHaveProperty("report_count_30d");
    expect(res.body.data).toHaveProperty("latest_snapshot_date");
  });

  it("returns compliance verification integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-reports/verification-integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set(
        "x-admin-session-id",
        "integration-compliance-verification-integrity"
      )
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("verification_attempt_count_24h");
    expect(res.body.data).toHaveProperty("verified_count_24h");
    expect(res.body.data).toHaveProperty("failed_count_24h");
  });

  it("lists generated reports", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-reports/reports?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-reports-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates invalid report query", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-reports/reports?reportType=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-reports-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates invalid report generation body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-reports/reports")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-reports-generate-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
