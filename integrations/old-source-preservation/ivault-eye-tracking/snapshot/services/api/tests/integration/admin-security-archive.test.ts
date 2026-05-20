import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security archive", () => {
  it("lists retention policies", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/retention-policies")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-policies")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns archive integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("archive_candidate_count");
    expect(res.body.data).toHaveProperty("deletion_candidate_count");
    expect(res.body.data).toHaveProperty("unsealed_manifest_count");
    expect(res.body.data).toHaveProperty("verified_manifest_count");
  });

  it("lists archive manifests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-archive/manifests?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-manifests")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates create archive manifest body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-archive/manifests")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-create-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates seal archive manifest body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-archive/manifests/00000000-0000-0000-0000-000000000000/seal")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-archive-seal-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
