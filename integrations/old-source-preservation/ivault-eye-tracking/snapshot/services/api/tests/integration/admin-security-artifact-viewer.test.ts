import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security artifact viewer", () => {
  it("lists viewer subjects", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-viewer/subjects?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-viewer-subjects")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists viewer sessions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-viewer/sessions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-viewer-sessions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists viewer render jobs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-viewer/render-jobs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-viewer-render-jobs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists viewer access events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-viewer/access-events?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-viewer-access-events")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns viewer integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-viewer/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-viewer-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_subject_count");
    expect(res.body.data).toHaveProperty("pending_render_job_count");
    expect(res.body.data).toHaveProperty("allowed_view_count_24h");
  });

  it("validates render job body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-artifact-viewer/render-jobs")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-viewer-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
