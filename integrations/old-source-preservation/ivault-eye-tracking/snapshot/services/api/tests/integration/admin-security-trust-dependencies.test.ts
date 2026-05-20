import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security trust dependencies", () => {
  it("lists trust dependencies", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-dependencies?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-dependencies-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists impact analyses", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-dependencies/impact-analyses?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-impact-analyses")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists propagation events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-dependencies/propagation-events?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-propagation-events")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns dependency integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-dependencies/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-dependency-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_dependency_count");
    expect(res.body.data).toHaveProperty("pending_propagation_event_count");
    expect(res.body.data).toHaveProperty("blocking_impact_analysis_count_24h");
  });

  it("validates dependency create body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-trust-dependencies")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-dependency-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
