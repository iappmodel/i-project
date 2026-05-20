import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security governance", () => {
  it("lists governance policies", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-governance/policies?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-governance-policies")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists governance rules", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-governance/rules?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-governance-rules")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists policy evaluations", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-governance/evaluations?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-governance-evaluations")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns governance integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-governance/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-governance-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_policy_count");
    expect(res.body.data).toHaveProperty("active_policy_rule_count");
    expect(res.body.data).toHaveProperty("active_policy_without_rules_count");
    expect(res.body.data).toHaveProperty("policy_evaluation_count_24h");
  });

  it("validates invalid policy category", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-governance/policies?category=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-security-governance-invalid")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
