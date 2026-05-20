import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security archive verification", () => {
  it("lists archive verification jobs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/verification-jobs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-verification-jobs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns archive verification integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/verification-jobs/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-verification-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_verification_job_count");
    expect(res.body.data).toHaveProperty("active_verification_job_count");
    expect(res.body.data).toHaveProperty("failed_verification_job_count");
    expect(res.body.data).toHaveProperty("abandoned_verification_job_count");
    expect(res.body.data).toHaveProperty("sealed_manifest_without_verification_job_count");
  });

  it("validates invalid verification job status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/verification-jobs?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-verification-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates enqueue verification params", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-archive/manifests/not-a-uuid/verification-jobs")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-verification-param")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
