import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security auditor portals", () => {
  it("lists auditor packet manifests", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditor-portals/packet-manifests?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-packet-manifests")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists auditor packet downloads", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditor-portals/packet-downloads?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-packet-downloads")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns auditor packet download integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditor-portals/packet-download-integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-packet-download-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("pending_manifest_count");
    expect(res.body.data).toHaveProperty("download_request_count_24h");
    expect(res.body.data).toHaveProperty("verification_attempt_count_24h");
  });
});
import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security auditor portals", () => {
  it("lists auditor portals", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditor-portals?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-portals-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists auditor evidence packets", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditor-portals/evidence-packets?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-packets-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists auditor questions", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditor-portals/questions?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-questions-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns auditor portal integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditor-portals/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("published_portal_count");
    expect(res.body.data).toHaveProperty("open_auditor_question_count");
    expect(res.body.data).toHaveProperty("activity_event_count_24h");
  });

  it("validates create auditor portal body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-auditor-portals")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-create-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
