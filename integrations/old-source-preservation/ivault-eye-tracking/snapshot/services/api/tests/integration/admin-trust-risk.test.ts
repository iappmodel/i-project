import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

describe("admin trust/risk", () => {
  let adminAccessToken: string;

  beforeAll(async () => {
    const admin = await getAdminUserToken();
    adminAccessToken = admin.accessToken;
  });

  it("can inspect trust score for a user", async () => {
    const userId = process.env.TEST_USER_ID!;

    await supabaseAdmin.rpc("recalculate_user_trust_score", {
      p_user_id: userId,
      p_metadata: {
        source: "admin_trust_risk_test"
      }
    });

    const res = await api()
      .get(`/v1/admin/trust/users/${userId}`)
      .set("authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);

    if (res.body.data) {
      expect(res.body.data).toHaveProperty("trustScore");
      expect(res.body.data).toHaveProperty("riskScore");
      expect(res.body.data).toHaveProperty("trustTier");
      expect(res.body.data).not.toHaveProperty("trust_score");
    }
  });

  it("can add an admin trust component", async () => {
    const userId = process.env.TEST_USER_ID!;

    const res = await api()
      .post(`/v1/admin/trust/users/${userId}/components`)
      .set("authorization", `Bearer ${adminAccessToken}`)
      .send({
        componentKey: "admin_manual_test_adjustment",
        componentCategory: "admin",
        scoreDelta: 0.01,
        riskDelta: -0.01,
        weight: 1,
        reasonCode: "admin_test",
        reasonMessage: "Integration test adjustment"
      })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("trustComponentId");
  });

  it("can list session risk events", async () => {
    const res = await api()
      .get("/v1/admin/risk/sessions?limit=10")
      .set("authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("can list network risk observations", async () => {
    const res = await api()
      .get("/v1/admin/risk/networks?limit=10")
      .set("authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("rejects trust component without bearer auth", async () => {
    const userId = process.env.TEST_USER_ID!;

    const res = await api()
      .post(`/v1/admin/trust/users/${userId}/components`)
      .send({
        componentKey: "bad",
        componentCategory: "admin",
        scoreDelta: 0,
        riskDelta: 0,
        weight: 1,
        reasonCode: "bad"
      })
      .expect(401);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("can list devices and update device status when one exists", async () => {
    const list = await api()
      .get("/v1/admin/risk/devices?limit=1")
      .set("authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(list.body.ok).toBe(true);

    const first = list.body.data.items[0];

    if (!first) {
      return;
    }

    const res = await api()
      .post(`/v1/admin/risk/devices/${first.deviceId}/status`)
      .set("authorization", `Bearer ${adminAccessToken}`)
      .send({
        status: "suspicious",
        reviewedBy: "integration_test",
        reasonCode: "integration_test_status_update",
        reasonMessage: "Marked suspicious by integration test"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe("suspicious");
  });
});
