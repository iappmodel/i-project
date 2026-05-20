import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin audit hash integrity", () => {
  it("returns admin audit hash integrity", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/audit/hash-integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    if (res.body.data) {
      expect(res.body.data).toHaveProperty("missing_admin_action_hash_count");
      expect(res.body.data).toHaveProperty("missing_privileged_action_hash_count");
      expect(res.body.data).toHaveProperty("missing_admin_security_alert_hash_count");
    }
  });

  it("system dashboard exposes admin security counts", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/system")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    expect(res.body.data).toHaveProperty("openAdminSecurityAlertCount");
    expect(res.body.data).toHaveProperty("criticalAdminSecurityAlertCount");
    expect(res.body.data).toHaveProperty("pendingPrivilegedActionCount");
  });
});
