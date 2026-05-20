import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security answer receipts", () => {
  it("lists answer receipts", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipts?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipts")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists answer receipt citations", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipts/citations?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-citations")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists answer receipt verifications", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipts/verifications?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-verifications")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns answer receipt integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipts/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("signed_receipt_count");
    expect(res.body.data).toHaveProperty("signed_missing_signature_count");
    expect(res.body.data).toHaveProperty("verification_attempt_count_24h");
  });

  it("validates create answer receipt body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-answer-receipts")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
