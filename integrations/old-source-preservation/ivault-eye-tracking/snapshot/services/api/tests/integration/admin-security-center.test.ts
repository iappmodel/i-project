import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security center", () => {
  it("returns summary", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-center/summary")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-center-summary")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("security_status");
    expect(res.body.data).toHaveProperty("open_alert_count");
    expect(res.body.data).toHaveProperty("open_incident_review_count");
    expect(res.body.data).toHaveProperty("open_corrective_action_count");
  });

  it("returns priority queue", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-center/priority-queue?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-center-priority")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns timeline", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-center/timeline?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-center-timeline")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns actor rollup", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-center/actors?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-center-actors")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns posture checks", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-center/posture-checks")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-center-posture")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates invalid priority item type", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-center/priority-queue?itemType=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-center-invalid-priority")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
