import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security questionnaires AI drafting", () => {
  it("lists questionnaire AI drafts", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-questionnaires/ai-drafts?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-questionnaires-ai-drafts")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists questionnaire AI match candidates", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-questionnaires/ai-match-candidates?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-questionnaires-ai-matches")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns questionnaire AI integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-questionnaires/ai-integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-questionnaires-ai-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_ai_draft_count");
    expect(res.body.data).toHaveProperty("flagged_ai_draft_count_24h");
    expect(res.body.data).toHaveProperty("blocked_ai_draft_count_24h");
  });

  it("returns questionnaire export verification integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-questionnaires/export-verification-integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-questionnaire-export-verification-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("verification_attempt_count_24h");
    expect(res.body.data).toHaveProperty("verified_count_24h");
    expect(res.body.data).toHaveProperty("failed_count_24h");
  });
});
