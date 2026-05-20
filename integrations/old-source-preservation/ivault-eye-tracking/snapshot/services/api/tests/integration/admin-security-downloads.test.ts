import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security downloads", () => {
  it("lists download subjects", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-downloads/subjects?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-download-subjects")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists download grants", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-downloads/grants?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-download-grants")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists download attempts", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-downloads/attempts?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-download-attempts")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns download integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-downloads/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-download-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_subject_count");
    expect(res.body.data).toHaveProperty("active_grant_count");
    expect(res.body.data).toHaveProperty("completed_download_count_24h");
  });

  it("validates create grant body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-downloads/grants")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-download-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
