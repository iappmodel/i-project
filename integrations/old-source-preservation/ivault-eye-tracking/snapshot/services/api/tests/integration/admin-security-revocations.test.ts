import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security revocations", () => {
  it("lists revocations", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-revocations?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-revocations-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists revocation notifications", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-revocations/notifications?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-revocation-notifications")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns revocation integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-revocations/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-revocation-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_revocation_count");
    expect(res.body.data).toHaveProperty("pending_notification_count");
    expect(res.body.data).toHaveProperty("revoked_report_missing_record_count");
  });

  it("validates force expire body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-revocations/force-expire")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-revocation-force-expire-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
