import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security trust AI analyst", () => {
  it("lists detectors", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-ai-analyst/detectors?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-ai-detectors")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists findings", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-ai-analyst/findings?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-ai-findings")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists customer risk scores", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-ai-analyst/risk-scores?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-ai-risk-scores")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists recommended actions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-ai-analyst/recommended-actions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-ai-actions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns AI integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-trust-ai-analyst/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-ai-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_detector_count");
    expect(res.body.data).toHaveProperty("open_finding_count");
    expect(res.body.data).toHaveProperty("open_recommended_action_count");
  });

  it("runs analyst manually", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-trust-ai-analyst/run")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-ai-run")
      .send({
        detectorFamily: "verification_abuse",
        metadata: {}
      })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("analystRunId");
  });

  it("validates resolve finding body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-trust-ai-analyst/findings/00000000-0000-0000-0000-000000000000/resolve")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-trust-ai-invalid-resolve")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
