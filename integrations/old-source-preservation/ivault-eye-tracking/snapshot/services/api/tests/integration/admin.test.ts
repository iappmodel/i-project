import { beforeAll, describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin", () => {
  let adminAccessToken: string;

  beforeAll(async () => {
    const admin = await getAdminUserToken();
    adminAccessToken = admin.accessToken;
  });

  it("returns system command center", async () => {
    const res = await api()
      .get("/v1/admin/system")
      .set("authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    if (res.body.data) {
      expect(res.body.data).toHaveProperty("systemStatus");
      expect(res.body.data).toHaveProperty("walletAccountingDeltaMinor");
      expect(res.body.data).toHaveProperty("auditMissingHashRecordCount");
      expect(res.body.data).not.toHaveProperty("system_status");
    }
  });

  it("returns money integrity dashboard", async () => {
    const res = await api()
      .get("/v1/admin/money-integrity")
      .set("authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    if (res.body.data) {
      expect(res.body.data).toHaveProperty("unbalancedJournalCount");
      expect(res.body.data).toHaveProperty("walletVsAccountingDeltaMinor");
    }
  });

  it("returns scheduler dashboard", async () => {
    const res = await api()
      .get("/v1/admin/scheduler")
      .set("authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);

    const first = res.body.data.items[0];

    if (first) {
      expect(first).toHaveProperty("jobKey");
      expect(first).toHaveProperty("lastStatus");
      expect(first).not.toHaveProperty("job_key");
    }
  });
});
