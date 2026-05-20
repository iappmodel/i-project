import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security alert delivery", () => {
  it("lists alert deliveries", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-deliveries?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns delivery integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-deliveries/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    if (res.body.data) {
      expect(res.body.data).toHaveProperty("high_alerts_without_delivery_count");
      expect(res.body.data).toHaveProperty("stale_delivery_count");
      expect(res.body.data).toHaveProperty("failed_delivery_count");
      expect(res.body.data).toHaveProperty("delivered_count_24h");
    }
  });

  it("rejects invalid delivery status filter", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-alert-deliveries?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
