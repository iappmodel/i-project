import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security evidence answers", () => {
  it("lists answer sessions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-evidence-answers/sessions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-sessions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists answer requests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-evidence-answers/requests?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-requests")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists answer citations", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-evidence-answers/citations?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-citations")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns answer integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-evidence-answers/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_answer_session_count");
    expect(res.body.data).toHaveProperty("answer_request_count_24h");
    expect(res.body.data).toHaveProperty("unsafe_uncited_answer_count");
  });

  it("validates create answer session body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-evidence-answers/sessions")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-answer-session-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
