import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security trust notifications", () => {
  it("lists subscribers", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-notifications/subscribers?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-notification-subscribers")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-notifications/events?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-notification-events")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists deliveries", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-notifications/deliveries?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-notification-deliveries")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns notification integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-notifications/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-notification-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_subscriber_count");
    expect(res.body.data).toHaveProperty("queued_event_count");
    expect(res.body.data).toHaveProperty("pending_delivery_count");
  });

  it("validates create subscriber body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-trust-notifications/subscribers")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-notification-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
