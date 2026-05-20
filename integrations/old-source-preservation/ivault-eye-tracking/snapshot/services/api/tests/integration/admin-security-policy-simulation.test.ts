import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security policy simulation", () => {
  it("lists policy simulation runs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes/simulations?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-simulation-runs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists policy simulation items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes/simulation-items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-simulation-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns policy simulation integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes/simulations/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-simulation-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("running_simulation_count");
    expect(res.body.data).toHaveProperty("failed_simulation_count_24h");
    expect(res.body.data).toHaveProperty("activation_blocking_simulation_count_24h");
    expect(res.body.data).toHaveProperty("approved_change_without_valid_simulation_count");
  });

  it("validates invalid simulation status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-policy-changes/simulations?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-policy-simulation-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
