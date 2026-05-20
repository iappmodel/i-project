import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
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

describe("admin MFA recovery codes", () => {
  it("returns recovery code status", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .get("/v1/admin/mfa/recovery-codes/status")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty("active_recovery_code_count");
  });

  it("generates recovery codes once-visible", async () => {
    process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER =
      process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER ?? "test-pepper";

    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/mfa/recovery-codes/generate")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        count: 5
      })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.recoveryCodes).toHaveLength(5);
    expect(res.body.data.warning).toContain("will not be shown again");
  });

  it("emits security alert when recovery codes are generated", async () => {
    process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER =
      process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER ?? "test-pepper";

    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/mfa/recovery-codes/generate")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        count: 3,
        metadata: {
          testCase: "recovery_code_generation_alert"
        }
      })
      .expect(201);

    expect(res.body.ok).toBe(true);

    const { data, error } = await supabaseAdmin
      .from("admin_security_alert_events")
      .select("*")
      .eq("actor_auth_user_id", admin.userId)
      .eq("alert_key", "admin_mfa_recovery_codes_generated")
      .contains("metadata", {
        testCase: "recovery_code_generation_alert"
      })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    expect(data?.[0]).toBeTruthy();
    expect(data?.[0].severity).toBe("high");
  });

  it("emits security alert when recovery codes are revoked", async () => {
    process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER =
      process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER ?? "test-pepper";

    const admin = await getAdminUserToken();

    await api()
      .post("/v1/admin/mfa/recovery-codes/generate")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        count: 2
      })
      .expect(201);

    const revoke = await api()
      .post("/v1/admin/mfa/recovery-codes/revoke")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        reason: "integration test revoke",
        metadata: {
          testCase: "recovery_code_revocation_alert"
        }
      })
      .expect(200);

    expect(revoke.body.ok).toBe(true);

    const { data, error } = await supabaseAdmin
      .from("admin_security_alert_events")
      .select("*")
      .eq("actor_auth_user_id", admin.userId)
      .eq("alert_key", "admin_mfa_recovery_codes_revoked")
      .contains("metadata", {
        testCase: "recovery_code_revocation_alert"
      })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    expect(data?.[0]).toBeTruthy();
    expect(data?.[0].severity).toBe("high");
  });

  it("emits critical security alert when recovery code is used", async () => {
    process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER =
      process.env.ADMIN_MFA_RECOVERY_CODE_PEPPER ?? "test-pepper";

    const admin = await getAdminUserToken();

    const generated = await api()
      .post("/v1/admin/mfa/recovery-codes/generate")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        count: 1
      })
      .expect(201);

    const code = generated.body.data.recoveryCodes[0];

    const challenge = await api()
      .post("/v1/admin/mfa/challenges")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeType: "recovery_code",
        purpose: "admin_write"
      })
      .expect(201);

    const verify = await api()
      .post("/v1/admin/mfa/recovery-codes/verify")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeId: challenge.body.data.adminMfaChallengeId,
        code,
        metadata: {
          testCase: "recovery_code_used_alert"
        }
      })
      .expect(200);

    expect(verify.body.ok).toBe(true);

    const { data, error } = await supabaseAdmin
      .from("admin_security_alert_events")
      .select("*")
      .eq("actor_auth_user_id", admin.userId)
      .eq("alert_key", "admin_mfa_recovery_code_used")
      .contains("metadata", {
        testCase: "recovery_code_used_alert"
      })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    expect(data?.[0]).toBeTruthy();
    expect(data?.[0].severity).toBe("critical");
  });

  it("emits security alert on invalid recovery code attempt", async () => {
    const admin = await getAdminUserToken();

    const challenge = await api()
      .post("/v1/admin/mfa/challenges")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeType: "recovery_code",
        purpose: "admin_write"
      })
      .expect(201);

    const res = await api()
      .post("/v1/admin/mfa/recovery-codes/verify")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        challengeId: challenge.body.data.adminMfaChallengeId,
        code: "WRONG-CODE",
        metadata: {
          testCase: "recovery_code_invalid_alert"
        }
      })
      .expect(403);

    expect(res.body.ok).toBe(false);

    const { data, error } = await supabaseAdmin
      .from("admin_security_alert_events")
      .select("*")
      .eq("actor_auth_user_id", admin.userId)
      .eq("alert_key", "admin_mfa_recovery_code_invalid_attempt")
      .contains("metadata", {
        testCase: "recovery_code_invalid_alert"
      })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    expect(data?.[0]).toBeTruthy();
    expect(data?.[0].severity).toBe("high");
  });

  it("validates recovery code generation count", async () => {
    const admin = await getAdminUserToken();

    const res = await api()
      .post("/v1/admin/mfa/recovery-codes/generate")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        count: 100
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
