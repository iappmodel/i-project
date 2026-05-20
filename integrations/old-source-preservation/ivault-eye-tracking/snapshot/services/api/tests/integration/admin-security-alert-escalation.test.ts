import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security alert escalation", () => {
  it("lists escalation events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-escalations?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns escalation integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-escalations/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    if (res.body.data) {
      expect(res.body.data).toHaveProperty("stale_open_critical_count");
      expect(res.body.data).toHaveProperty("stale_open_high_count");
      expect(res.body.data).toHaveProperty("stale_acknowledged_count");
      expect(res.body.data).toHaveProperty("failed_delivery_count");
      expect(res.body.data).toHaveProperty("privileged_actions_expiring_soon_count");
      expect(res.body.data).toHaveProperty("escalation_count_24h");
    }
  });

  it("rejects invalid escalation query limit", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-escalations?limit=1000")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
