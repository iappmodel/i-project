import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin security auditor exports", () => {
  it("lists auditor exports with generation fields", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/security-auditors/exports")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-exports-generation")
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("validates approve export body", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/security-auditors/exports/00000000-0000-0000-0000-000000000000/approve")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .set("x-admin-session-id", "integration-auditor-export-approve-invalid")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
