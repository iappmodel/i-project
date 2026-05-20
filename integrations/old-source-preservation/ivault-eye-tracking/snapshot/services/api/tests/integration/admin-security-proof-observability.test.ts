import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security proof observability", () => {
  it("gets latest command center snapshot", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-observability/latest")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-observability-latest")
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it("gets command center queues", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-observability/queues")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-observability-queues")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_incidents");
    expect(res.body.data).toHaveProperty("critical_incidents");
    expect(res.body.data).toHaveProperty("queued_digests");
  });

  it("lists customer trust health", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-observability/customer-health?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-observability-customer-health")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists proof health signals", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-observability/signals?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-observability-signals")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists recent activity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-observability/activity?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-observability-activity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns observability integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-proof-observability/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-observability-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("recent_global_snapshot_count");
    expect(res.body.data).toHaveProperty("active_critical_signal_count");
    expect(res.body.data).toHaveProperty("critical_customer_health_count");
  });

  it("validates signal body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-proof-observability/signals")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-proof-observability-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
