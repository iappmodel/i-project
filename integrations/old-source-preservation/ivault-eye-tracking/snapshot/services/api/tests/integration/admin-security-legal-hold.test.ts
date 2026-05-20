import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security legal holds", () => {
  it("lists legal holds", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-legal-holds?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-legal-hold-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns legal hold integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-legal-holds/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-legal-hold-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_legal_hold_count");
    expect(res.body.data).toHaveProperty("expired_unprocessed_legal_hold_count");
    expect(res.body.data).toHaveProperty("active_legal_hold_target_count");
    expect(res.body.data).toHaveProperty("released_legal_hold_count_30d");
  });

  it("lists legal hold targets", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-legal-holds/targets?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-legal-hold-targets")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates create legal hold body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-legal-holds")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-legal-hold-create-body")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("validates invalid legal hold query", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-legal-holds?status=evil")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-legal-hold-invalid-query")
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
