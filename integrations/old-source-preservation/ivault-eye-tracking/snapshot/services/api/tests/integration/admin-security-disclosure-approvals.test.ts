import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security disclosure approvals", () => {
  it("lists disclosure approvals", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-disclosure-approvals?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-approvals-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists disclosure approval decisions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-disclosure-approvals/decisions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-approval-decisions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns disclosure approval integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-disclosure-approvals/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-approval-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_approval_count");
    expect(res.body.data).toHaveProperty("high_risk_pending_approval_count");
    expect(res.body.data).toHaveProperty("approved_missing_second_admin_count");
  });

  it("validates create disclosure approval body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-disclosure-approvals")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-disclosure-approval-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
