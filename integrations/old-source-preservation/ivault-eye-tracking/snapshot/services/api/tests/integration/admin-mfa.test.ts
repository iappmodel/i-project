import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin MFA", () => {
  it("returns admin MFA status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/mfa/status")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it("creates MFA challenge", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/mfa/challenges")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeType: "stub",
        purpose: "admin_write"
      })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("adminMfaChallengeId");
    expect(res.body.data.status).toBe("pending");
  });

  it("rejects invalid MFA challenge body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/mfa/challenges")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeType: "evil",
        purpose: "admin_write"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("verifies stub MFA challenge when enabled", async () => {
    if (process.env.ADMIN_MFA_STUB_ENABLED !== "true") return;

    const admin = await getAdminUserToken();

    const challenge = await api()
      .post("/v1/admin/mfa/challenges")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeType: "stub",
        purpose: "admin_write"
      })
      .expect(201);

    const res = await api()
      .post("/v1/admin/mfa/challenges/verify")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeId: challenge.body.data.adminMfaChallengeId,
        code: "000000"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe("verified");
  });
});
