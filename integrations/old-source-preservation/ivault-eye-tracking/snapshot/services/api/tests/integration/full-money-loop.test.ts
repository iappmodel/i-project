import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
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

describe("full money loop", () => {
  it("runs fixture loop and leaves money/audit integrity clean", async () => {
    const { data: fixtureRunId, error } = await supabaseAdmin.rpc("seed_demo_core_money_loop", {
      p_fixture_key: `api_integration_${Date.now()}`,
      p_fixture_version: "v1",
      p_metadata: {
        source: "api_integration_test"
      }
    });

    if (error) throw error;

    expect(fixtureRunId).toBeTruthy();

    await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "accounting_mirror_every_minute",
        lockedBy: "integration_test"
      })
      .expect(200);

    await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "audit_hash_backfill_hourly",
        lockedBy: "integration_test"
      })
      .expect(200);

    await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "audit_hash_verify_daily",
        lockedBy: "integration_test"
      })
      .expect(200);

    await api()
      .post("/v1/worker/jobs/run")
      .set("x-worker-secret", process.env.WORKER_API_SECRET!)
      .send({
        jobKey: "observability_snapshot_every_5_minutes",
        lockedBy: "integration_test"
      })
      .expect(200);

    const admin = await getAdminUserToken();

    const money = await api()
      .get("/v1/admin/money-integrity")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(money.body.ok).toBe(true);
    expect(money.body.data.unbalancedJournalCount).toBe(0);
    expect(money.body.data.walletVsAccountingDeltaMinor).toBe(0);
    expect(money.body.data.rewardIntegrityIssueCount).toBe(0);

    const system = await api()
      .get("/v1/admin/system")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(system.body.ok).toBe(true);
    expect(system.body.data.auditBrokenVerificationCount24h).toBe(0);
  });
});
