import { createClient } from "@supabase/supabase-js";
import { generateSync } from "otplib";
import { describe, expect, it } from "vitest";
import { decryptSecret } from "../../src/modules/admin-mfa/admin-mfa.crypto";
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

describe("admin TOTP MFA", () => {
  it("enrolls and confirms TOTP", async () => {
    process.env.ADMIN_MFA_ENCRYPTION_KEY_BASE64 =
      process.env.ADMIN_MFA_ENCRYPTION_KEY_BASE64 ?? Buffer.alloc(32, 7).toString("base64");

    const admin = await getAdminUserToken();

    const enroll = await api()
      .post("/v1/admin/mfa/totp/enroll")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        label: "Integration Test Authenticator"
      })
      .expect(201);

    expect(enroll.body.ok).toBe(true);
    expect(enroll.body.data).toHaveProperty("factorId");
    expect(enroll.body.data).toHaveProperty("otpauthUrl");
    expect(enroll.body.data).toHaveProperty("qrCodeDataUrl");

    const factorId = String(enroll.body.data.factorId);

    const { data: factor, error } = await supabaseAdmin
      .from("admin_mfa_factors")
      .select("*")
      .eq("id", factorId)
      .single();

    if (error || !factor) {
      throw error ?? new Error("factor not found");
    }

    const secret = decryptSecret(String(factor.secret_ciphertext));
    const code = generateSync({
      strategy: "totp",
      secret
    });

    const confirm = await api()
      .post("/v1/admin/mfa/totp/confirm")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        factorId,
        code
      })
      .expect(200);

    expect(confirm.body.ok).toBe(true);
    expect(confirm.body.data.status).toBe("active");
  });

  it("rejects invalid confirm code", async () => {
    const admin = await getAdminUserToken();

    const enroll = await api()
      .post("/v1/admin/mfa/totp/enroll")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        label: "Bad Code Test"
      })
      .expect(201);

    const res = await api()
      .post("/v1/admin/mfa/totp/confirm")
      .set("authorization", `Bearer ${admin.accessToken}`)
      .send({
        factorId: enroll.body.data.factorId,
        code: "123456"
      })
      .expect(403);

    expect(res.body.ok).toBe(false);
  });
});
