import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security retention", () => {
  it("lists retention subjects", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-retention/subjects?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-retention-subjects")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists legal holds", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-retention/legal-holds?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-retention-legal-holds")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists retention decisions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-retention/decisions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-retention-decisions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns retention integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-retention/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-retention-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("retention_subject_count");
    expect(res.body.data).toHaveProperty("legal_hold_subject_count");
    expect(res.body.data).toHaveProperty("decision_missing_hash_count");
  });

  it("validates register retention subject body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-retention/subjects")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-retention-register-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
