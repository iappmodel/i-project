import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getAdminUserToken } from "../setup/test-users";

describe("admin audited actions", () => {
  it("adds trust component through audited RPC", async () => {
    const admin = await getAdminUserToken();
    const userId = process.env.TEST_USER_ID!;

    const res = await api()
      .post(`/v1/admin/trust/users/${userId}/components`)
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        componentKey: "admin_audited_test_adjustment",
        componentCategory: "admin",
        scoreDelta: 0.01,
        riskDelta: -0.01,
        weight: 1,
        reasonCode: "admin_audited_test",
        reasonMessage: "Audited admin action test"
      })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("trustComponentId");
  });

  it("records admin action audit events", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/audit/actions?limit=20")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);

    const found = res.body.data.items.some(
      (item: any) =>
        item.action_key === "admin_add_trust_score_component" ||
        item.actionKey === "admin_add_trust_score_component"
    );

    expect(found).toBe(true);
  });

  it("uses authenticated admin identity for withdrawal review", async () => {
    const admin = await getAdminUserToken();

    const queue = await api()
      .get("/v1/admin/withdrawals/review-queue")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(queue.body.ok).toBe(true);

    const item = queue.body.data.items?.[0];

    if (!item) {
      return;
    }

    const withdrawalId = item.withdrawalRequestId ?? item.withdrawal_request_id;

    const res = await api()
      .post(`/v1/admin/withdrawals/${withdrawalId}/review/approve`)
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        reviewNote: "Approved by audited action integration test"
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe("approved");
  });
});
