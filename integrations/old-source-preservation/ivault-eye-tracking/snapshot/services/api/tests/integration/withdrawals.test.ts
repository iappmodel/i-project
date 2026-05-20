import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { api } from "../setup/client";
import { getPrimaryUserToken } from "../setup/test-users";

const adminDb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false
  }
});

describe("withdrawals", () => {
  it("rejects invalid withdrawal request", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .post("/v1/withdrawals")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({
        walletId: "not-a-uuid",
        amountMinor: -100,
        currencyCode: "USD",
        idempotencyKey: "bad"
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("creates a withdrawal when wallet has available balance", async () => {
    const user = await getPrimaryUserToken();

    const walletSummaryRes = await api()
      .get("/v1/wallet/summary")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(walletSummaryRes.body.ok).toBe(true);
    expect(walletSummaryRes.body.data).toHaveProperty("walletId");

    const walletId = String(walletSummaryRes.body.data.walletId);

    const seedKey = `test-withdraw-seed-${Date.now()}`;
    const { error: seedError } = await adminDb.rpc("create_available_wallet_value_lot", {
      p_wallet_id: walletId,
      p_user_id: user.userId,
      p_amount_minor: 1_000,
      p_source_type: "admin_credit",
      p_source_id: null,
      p_idempotency_key: seedKey,
      p_metadata: {
        seededBy: "withdrawals.integration.test"
      }
    });

    if (seedError) {
      throw seedError;
    }

    const createRes = await api()
      .post("/v1/withdrawals")
      .set("authorization", `Bearer ${user.accessToken}`)
      .send({
        walletId,
        amountMinor: 100,
        currencyCode: "USD",
        providerKey: "manual_demo",
        idempotencyKey: `test-withdraw-create-${Date.now()}`,
        metadata: {
          testCase: "create_withdrawal"
        }
      })
      .expect(201);

    expect(createRes.body.ok).toBe(true);
    expect(createRes.body.data.status).toBe("approved");
    expect(typeof createRes.body.data.withdrawalRequestId).toBe("string");
  });

  it("returns withdrawal history", async () => {
    const user = await getPrimaryUserToken();

    const res = await api()
      .get("/v1/withdrawals?limit=10")
      .set("authorization", `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data).toHaveProperty("nextCursor");
  });
});
