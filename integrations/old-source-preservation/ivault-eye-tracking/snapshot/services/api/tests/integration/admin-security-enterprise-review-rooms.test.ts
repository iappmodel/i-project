import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security enterprise review rooms", () => {
  it("lists enterprise review rooms", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-enterprise-review-rooms?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-enterprise-review-rooms-list")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists enterprise review room participants", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-enterprise-review-rooms/participants?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-enterprise-review-room-participants")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lists enterprise review room documents", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-enterprise-review-rooms/documents?limit=10")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-enterprise-review-room-documents")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("returns enterprise review room integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-enterprise-review-rooms/integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-enterprise-review-room-integrity")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("published_room_count");
    expect(res.body.data).toHaveProperty("active_participant_count");
    expect(res.body.data).toHaveProperty("active_document_grant_count");
  });

  it("validates create room body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-enterprise-review-rooms")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-enterprise-review-room-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
