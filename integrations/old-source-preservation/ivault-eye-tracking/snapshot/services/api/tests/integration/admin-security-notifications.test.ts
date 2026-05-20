import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security notifications", () => {
  it("lists notification channels", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-notifications/channels")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-notification-channels")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns notification integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-notifications/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-notification-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_channel_count");
    expect(res.body.data).toHaveProperty("pending_delivery_count");
    expect(res.body.data).toHaveProperty("failed_delivery_count");
    expect(res.body.data).toHaveProperty("abandoned_delivery_count");
  });

  it("lists notification deliveries", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-notifications/deliveries?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-notification-deliveries")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates invalid delivery status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-notifications/deliveries?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-notification-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
