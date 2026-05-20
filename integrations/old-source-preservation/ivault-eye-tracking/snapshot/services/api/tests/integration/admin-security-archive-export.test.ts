import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security archive exports", () => {
  it("lists archive export jobs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/export-jobs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-export-jobs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns archive export integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/export-jobs/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-export-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_export_job_count");
    expect(res.body.data).toHaveProperty("active_export_job_count");
    expect(res.body.data).toHaveProperty("failed_export_job_count");
    expect(res.body.data).toHaveProperty("abandoned_export_job_count");
  });

  it("validates invalid export job status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/export-jobs?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-export-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates enqueue export body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post(
        "/v1/admin/security-archive/manifests/00000000-0000-0000-0000-000000000000/export-jobs"
      )
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-export-enqueue-body")
      .send({
        storageProvider: "evil"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
