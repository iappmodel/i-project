import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security artifact search", () => {
  it("lists search documents", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-search/documents?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-search-documents")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists search chunks", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-search/chunks?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-search-chunks")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists search sessions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-search/sessions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-search-sessions")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists search queries", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-search/queries?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-search-queries")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns search integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-artifact-search/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-search-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("ready_document_count");
    expect(res.body.data).toHaveProperty("search_chunk_count");
    expect(res.body.data).toHaveProperty("search_query_count_24h");
  });

  it("validates create session body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-artifact-search/sessions")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-search-session-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
