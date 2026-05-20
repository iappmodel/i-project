import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security answer receipt exports", () => {
  it("lists export bundles", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipt-exports/bundles?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-export-bundles")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists export bundle items", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipt-exports/items?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-export-items")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists export bundle files", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipt-exports/files?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-export-files")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists export jobs", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipt-exports/jobs?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-export-jobs")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns export integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-answer-receipt-exports/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-export-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("ready_bundle_count");
    expect(res.body.data).toHaveProperty("unsafe_raw_artifact_bundle_count");
    expect(res.body.data).toHaveProperty("ready_missing_checksum_count");
  });

  it("validates create bundle body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-answer-receipt-exports/bundles")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-receipt-export-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
