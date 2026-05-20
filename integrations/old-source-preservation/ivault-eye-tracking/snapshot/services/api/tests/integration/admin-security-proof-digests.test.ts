import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security proof digests", () => {
  it("lists proof digest subscriptions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-digests/subscriptions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-digest-subscriptions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists proof notification events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-digests/events?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-digest-events")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists proof digest runs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-digests/runs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-digest-runs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists proof digest items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-digests/items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-digest-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns proof digest integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-digests/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-digest-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_subscription_count");
    expect(res.body.data).toHaveProperty("pending_notification_event_count");
    expect(res.body.data).toHaveProperty("queued_digest_count");
  });

  it("validates admin subscription body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-proof-digests/subscriptions/admin")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-digest-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
