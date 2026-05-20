import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security controls", () => {
  it("lists control coverage", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-controls/coverage?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-controls-coverage")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists policy-control mappings", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-controls/mappings")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-controls-mappings")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists evidence runs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-controls/evidence-runs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-controls-evidence-runs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns control mapping integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-controls/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-controls-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_framework_count");
    expect(res.body.data).toHaveProperty("active_control_count");
    expect(res.body.data).toHaveProperty("covered_control_count");
    expect(res.body.data).toHaveProperty("uncovered_or_gap_control_count");
  });

  it("validates invalid coverage status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-controls/coverage?coverageStatus=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-controls-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
