import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken } from "../setup/test-users";

const getUserToken = getPrimaryUserToken;

describe("auditor portal", () => {
  it("requires active auditor access for export request", async () => {
    const user = await getUserToken();

    const res = await api()
      .post("/v1/auditor/exports")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({
        exportType: "audit_summary_bundle",
        exportFormat: "json",
        metadata: {}
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
  });

  it("validates invalid export request", async () => {
    const user = await getUserToken();

    const res = await api()
      .post("/v1/auditor/exports")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({
        exportType: "evil",
        metadata: {}
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken } from "../setup/test-users";

describe("auditor portal", () => {
  it("requires active auditor access for coverage", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/auditor/coverage?limit=10")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
  });

  it("requires active auditor access for evidence", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/auditor/evidence?limit=10")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
  });

  it("requires active auditor access for policies", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/auditor/policies?limit=10")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
  });

  it("requires active auditor access for compliance report download", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/auditor/compliance-reports/00000000-0000-0000-0000-000000000000/download")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(403);

    expect(res.body.ok).toBe(false);
  });
});
