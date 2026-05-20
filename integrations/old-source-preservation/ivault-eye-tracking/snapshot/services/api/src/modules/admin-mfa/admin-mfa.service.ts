import { supabaseAdmin } from "../../config/supabase";
import { decryptSecret, encryptSecret } from "./admin-mfa.crypto";
import {
  buildTotpOtpAuthUrl,
  buildTotpQrCodeDataUrl,
  generateTotpSecret,
  getCurrentTotpTimeStep,
  verifyTotpCode
} from "./admin-mfa.totp";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode
} from "./admin-mfa.recovery-codes";

type JsonRecord = Record<string, unknown>;

type AdminMfaFactorRow = {
  id: string;
  status: string;
  secret_ciphertext: string;
  failure_count: number | null;
  created_at: string;
};

type AdminMfaChallengeRow = {
  id: string;
  status: string;
  purpose: string;
  expires_at: string;
};

type AdminMfaRecoveryCodeRow = {
  id: string;
  metadata: JsonRecord | null;
};

function getIssuer() {
  return process.env.ADMIN_MFA_TOTP_ISSUER ?? "i Admin";
}

function getTotpWindow() {
  const value = Number(process.env.ADMIN_MFA_TOTP_ALLOWED_WINDOW ?? "1");
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 2) : 1;
}

export async function enrollAdminTotpFactor(input: {
  adminAuthUserId: string;
  requestId: string;
  label?: string;
  metadata?: JsonRecord;
}) {
  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select("*")
    .eq("user_id", input.adminAuthUserId)
    .eq("status", "active")
    .maybeSingle();

  if (adminError) throw adminError;
  if (!admin) throw new Error("admin user not found or inactive");

  const secret = generateTotpSecret();
  const encryptedSecret = encryptSecret(secret);

  const { data: factor, error } = await supabaseAdmin
    .from("admin_mfa_factors")
    .insert({
      admin_auth_user_id: input.adminAuthUserId,
      admin_user_id: admin.id,
      factor_type: "totp",
      provider: "totp",
      status: "pending",
      label: input.label ?? "Authenticator app",
      secret_ciphertext: encryptedSecret,
      secret_key_version: "v1",
      metadata: {
        requestId: input.requestId,
        ...(input.metadata ?? {})
      }
    })
    .select("*")
    .single();

  if (error) throw error;

  const accountName = String(admin.email ?? input.adminAuthUserId);
  const otpauthUrl = buildTotpOtpAuthUrl({
    issuer: getIssuer(),
    accountName,
    secret
  });
  const qrCodeDataUrl = await buildTotpQrCodeDataUrl(otpauthUrl);

  await supabaseAdmin.rpc("record_admin_action", {
    p_auth_user_id: input.adminAuthUserId,
    p_action_key: "enroll_admin_totp_factor",
    p_permission_key: null,
    p_target_type: "admin_mfa_factor",
    p_target_id: factor.id,
    p_request_id: input.requestId,
    p_endpoint: null,
    p_method: null,
    p_decision: "allowed",
    p_reason: "TOTP factor enrollment started",
    p_metadata: {
      label: input.label ?? "Authenticator app"
    }
  });

  return {
    factorId: String(factor.id),
    status: "pending" as const,
    otpauthUrl,
    qrCodeDataUrl
  };
}

export async function confirmAdminTotpEnrollment(input: {
  adminAuthUserId: string;
  factorId: string;
  code: string;
  requestId: string;
  metadata?: JsonRecord;
}) {
  const { data, error } = await supabaseAdmin
    .from("admin_mfa_factors")
    .select("*")
    .eq("id", input.factorId)
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .eq("factor_type", "totp")
    .maybeSingle<AdminMfaFactorRow>();

  if (error) throw error;
  if (!data) throw new Error("admin TOTP factor not found");
  if (data.status !== "pending") throw new Error("admin TOTP factor is not pending");

  const secret = decryptSecret(String(data.secret_ciphertext));
  const ok = verifyTotpCode({ token: input.code, secret, window: getTotpWindow() });

  if (!ok) {
    await supabaseAdmin
      .from("admin_mfa_factors")
      .update({
        failure_count: Number(data.failure_count ?? 0) + 1
      })
      .eq("id", input.factorId);

    throw new Error("invalid TOTP code");
  }

  const timeStep = getCurrentTotpTimeStep();
  const now = new Date().toISOString();

  const { error: usedError } = await supabaseAdmin.from("admin_mfa_totp_used_steps").insert({
    admin_mfa_factor_id: input.factorId,
    admin_auth_user_id: input.adminAuthUserId,
    time_step: timeStep,
    metadata: {
      requestId: input.requestId,
      purpose: "totp_enrollment"
    }
  });

  if (usedError) throw new Error("TOTP code was already used");

  const { error: updateError } = await supabaseAdmin
    .from("admin_mfa_factors")
    .update({
      status: "active",
      confirmed_at: now,
      last_verified_at: now,
      last_used_time_step: timeStep
    })
    .eq("id", input.factorId);

  if (updateError) throw updateError;

  await supabaseAdmin.rpc("record_admin_action", {
    p_auth_user_id: input.adminAuthUserId,
    p_action_key: "confirm_admin_totp_enrollment",
    p_permission_key: null,
    p_target_type: "admin_mfa_factor",
    p_target_id: input.factorId,
    p_request_id: input.requestId,
    p_endpoint: null,
    p_method: null,
    p_decision: "allowed",
    p_reason: "TOTP factor confirmed",
    p_metadata: input.metadata ?? {}
  });

  return {
    factorId: input.factorId,
    status: "active" as const
  };
}

export async function verifyAdminTotpChallenge(input: {
  adminAuthUserId: string;
  challengeId: string;
  code: string;
  requestId: string;
  metadata?: JsonRecord;
}) {
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from("admin_mfa_challenges")
    .select("*")
    .eq("id", input.challengeId)
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .maybeSingle<AdminMfaChallengeRow>();

  if (challengeError) throw challengeError;
  if (!challenge) throw new Error("admin MFA challenge not found");
  if (challenge.status !== "pending") throw new Error("MFA challenge is not pending");

  const expiresAt = new Date(String(challenge.expires_at)).getTime();
  if (expiresAt <= Date.now()) {
    await supabaseAdmin
      .from("admin_mfa_challenges")
      .update({ status: "expired" })
      .eq("id", input.challengeId);

    throw new Error("MFA challenge expired");
  }

  const { data: factors, error: factorError } = await supabaseAdmin
    .from("admin_mfa_factors")
    .select("*")
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .eq("factor_type", "totp")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (factorError) throw factorError;
  const factorRows = (factors ?? []) as AdminMfaFactorRow[];

  if (factorRows.length === 0) {
    throw new Error("no active TOTP factor found");
  }

  const matchedFactor =
    factorRows.find((factor) =>
      verifyTotpCode({
        token: input.code,
        secret: decryptSecret(String(factor.secret_ciphertext)),
        window: getTotpWindow()
      })
    ) ?? null;

  if (!matchedFactor) {
    await supabaseAdmin
      .from("admin_mfa_challenges")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_reason: "invalid TOTP code"
      })
      .eq("id", input.challengeId);

    throw new Error("invalid TOTP code");
  }

  const timeStep = getCurrentTotpTimeStep();
  const { error: usedError } = await supabaseAdmin.from("admin_mfa_totp_used_steps").insert({
    admin_mfa_factor_id: matchedFactor.id,
    admin_auth_user_id: input.adminAuthUserId,
    time_step: timeStep,
    challenge_id: input.challengeId,
    metadata: {
      requestId: input.requestId,
      purpose: challenge.purpose
    }
  });

  if (usedError) throw new Error("TOTP code was already used");

  const { data: verificationId, error: verifyError } = await supabaseAdmin.rpc(
    "create_admin_mfa_verification",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_challenge_id: input.challengeId,
      p_method: "totp",
      p_provider: "totp",
      p_request_id: input.requestId,
      p_metadata: {
        factorId: matchedFactor.id,
        ...(input.metadata ?? {})
      }
    }
  );

  if (verifyError) throw verifyError;

  await supabaseAdmin
    .from("admin_mfa_factors")
    .update({
      last_verified_at: new Date().toISOString(),
      last_used_time_step: timeStep
    })
    .eq("id", matchedFactor.id);

  return {
    adminMfaVerificationId: String(verificationId),
    status: "verified" as const,
    method: "totp" as const
  };
}

export async function listMyAdminMfaFactors(input: { adminAuthUserId: string }) {
  const { data, error } = await supabaseAdmin
    .from("admin_my_mfa_factors")
    .select("*")
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function disableMyAdminMfaFactor(input: {
  adminAuthUserId: string;
  factorId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("disable_admin_mfa_factor", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_factor_id: input.factorId,
    p_reason: input.reason,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    factorId: String(data),
    status: "disabled" as const
  };
}

export async function revokeMyAdminMfaFactor(input: {
  adminAuthUserId: string;
  factorId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("revoke_admin_mfa_factor", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_factor_id: input.factorId,
    p_reason: input.reason,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    factorId: String(data),
    status: "revoked" as const
  };
}

export async function generateAdminRecoveryCodes(input: {
  adminAuthUserId: string;
  count: number;
  requestId: string;
  metadata?: JsonRecord;
}) {
  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select("*")
    .eq("user_id", input.adminAuthUserId)
    .eq("status", "active")
    .maybeSingle();

  if (adminError) throw adminError;
  if (!admin) throw new Error("admin user not found or inactive");

  const codes = generateRecoveryCodes(input.count);
  const rows = codes.map((code) => ({
    admin_auth_user_id: input.adminAuthUserId,
    admin_user_id: admin.id,
    code_hash: hashRecoveryCode({
      adminAuthUserId: input.adminAuthUserId,
      code
    }),
    hash_version: "sha256_v1",
    status: "active",
    metadata: {
      requestId: input.requestId,
      ...(input.metadata ?? {})
    }
  }));

  const { error } = await supabaseAdmin.from("admin_mfa_recovery_codes").insert(rows);
  if (error) throw error;

  await supabaseAdmin.rpc("record_admin_action", {
    p_auth_user_id: input.adminAuthUserId,
    p_action_key: "generate_admin_mfa_recovery_codes",
    p_permission_key: null,
    p_target_type: "admin_mfa_recovery_codes",
    p_target_id: null,
    p_request_id: input.requestId,
    p_endpoint: null,
    p_method: null,
    p_decision: "allowed",
    p_reason: "admin MFA recovery codes generated",
    p_metadata: {
      count: codes.length
    }
  });

  await supabaseAdmin.rpc("create_admin_mfa_recovery_code_security_alert", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_alert_key: "admin_mfa_recovery_codes_generated",
    p_severity: "high",
    p_action_key: "generate_admin_mfa_recovery_codes",
    p_message: "Admin MFA recovery codes were generated.",
    p_request_id: input.requestId,
    p_metadata: {
      count: codes.length,
      ...(input.metadata ?? {})
    }
  });

  return {
    recoveryCodes: codes,
    count: codes.length,
    warning: "Save these recovery codes now. They will not be shown again."
  };
}

export async function verifyAdminRecoveryCodeChallenge(input: {
  adminAuthUserId: string;
  challengeId: string;
  code: string;
  requestId: string;
  metadata?: JsonRecord;
}) {
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from("admin_mfa_challenges")
    .select("*")
    .eq("id", input.challengeId)
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .maybeSingle<AdminMfaChallengeRow>();

  if (challengeError) throw challengeError;
  if (!challenge) throw new Error("admin MFA challenge not found");
  if (challenge.status !== "pending") throw new Error("MFA challenge is not pending");

  if (new Date(String(challenge.expires_at)).getTime() <= Date.now()) {
    await supabaseAdmin.from("admin_mfa_challenges").update({ status: "expired" }).eq("id", input.challengeId);
    throw new Error("MFA challenge expired");
  }

  const codeHash = hashRecoveryCode({
    adminAuthUserId: input.adminAuthUserId,
    code: normalizeRecoveryCode(input.code)
  });

  const { data: recoveryCode, error: codeError } = await supabaseAdmin
    .from("admin_mfa_recovery_codes")
    .select("*")
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .eq("code_hash", codeHash)
    .eq("status", "active")
    .maybeSingle<AdminMfaRecoveryCodeRow>();

  if (codeError) throw codeError;

  if (!recoveryCode) {
    await supabaseAdmin
      .from("admin_mfa_challenges")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_reason: "invalid recovery code"
      })
      .eq("id", input.challengeId);

    await supabaseAdmin.rpc("record_admin_action", {
      p_auth_user_id: input.adminAuthUserId,
      p_action_key: "verify_admin_recovery_code_challenge",
      p_permission_key: null,
      p_target_type: "admin_mfa_challenge",
      p_target_id: input.challengeId,
      p_request_id: input.requestId,
      p_endpoint: null,
      p_method: null,
      p_decision: "denied",
      p_reason: "invalid recovery code",
      p_metadata: input.metadata ?? {}
    });

    await supabaseAdmin.rpc("create_admin_mfa_recovery_code_security_alert", {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_alert_key: "admin_mfa_recovery_code_invalid_attempt",
      p_severity: "high",
      p_action_key: "verify_admin_recovery_code_challenge",
      p_message: "Invalid admin MFA recovery code attempt.",
      p_request_id: input.requestId,
      p_metadata: {
        challengeId: input.challengeId,
        ...(input.metadata ?? {})
      }
    });

    throw new Error("invalid recovery code");
  }

  const { data: verificationId, error: verifyError } = await supabaseAdmin.rpc(
    "create_admin_mfa_verification",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_challenge_id: input.challengeId,
      p_method: "recovery_code",
      p_provider: "recovery_code",
      p_request_id: input.requestId,
      p_metadata: {
        recoveryCodeId: recoveryCode.id,
        ...(input.metadata ?? {})
      }
    }
  );

  if (verifyError) throw verifyError;

  const { data: updatedRecoveryCode, error: updateCodeError } = await supabaseAdmin
    .from("admin_mfa_recovery_codes")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
      used_challenge_id: input.challengeId,
      metadata: {
        ...(recoveryCode.metadata ?? {}),
        usedRequestId: input.requestId
      }
    })
    .eq("id", recoveryCode.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (updateCodeError) throw updateCodeError;
  if (!updatedRecoveryCode) throw new Error("Recovery code has already been used");

  await supabaseAdmin.rpc("record_admin_action", {
    p_auth_user_id: input.adminAuthUserId,
    p_action_key: "verify_admin_recovery_code_challenge",
    p_permission_key: null,
    p_target_type: "admin_mfa_recovery_code",
    p_target_id: recoveryCode.id,
    p_request_id: input.requestId,
    p_endpoint: null,
    p_method: null,
    p_decision: "allowed",
    p_reason: "admin MFA recovery code used",
    p_metadata: {
      challengeId: input.challengeId,
      verificationId
    }
  });

  await supabaseAdmin.rpc("create_admin_mfa_recovery_code_security_alert", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_alert_key: "admin_mfa_recovery_code_used",
    p_severity: "critical",
    p_action_key: "verify_admin_recovery_code_challenge",
    p_message: "Admin MFA recovery code was used.",
    p_request_id: input.requestId,
    p_metadata: {
      challengeId: input.challengeId,
      recoveryCodeId: recoveryCode.id,
      verificationId: String(verificationId),
      ...(input.metadata ?? {})
    }
  });

  return {
    adminMfaVerificationId: String(verificationId),
    status: "verified" as const,
    method: "recovery_code" as const
  };
}

export async function revokeMyAdminRecoveryCodes(input: {
  adminAuthUserId: string;
  reason: string;
  requestId: string;
  metadata?: JsonRecord;
}) {
  const { count: activeCount, error: countError } = await supabaseAdmin
    .from("admin_mfa_recovery_codes")
    .select("*", { count: "exact", head: true })
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .eq("status", "active");

  if (countError) throw countError;

  const { error } = await supabaseAdmin
    .from("admin_mfa_recovery_codes")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      metadata: {
        reason: input.reason,
        requestId: input.requestId,
        ...(input.metadata ?? {})
      }
    })
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .eq("status", "active");

  if (error) throw error;

  await supabaseAdmin.rpc("record_admin_action", {
    p_auth_user_id: input.adminAuthUserId,
    p_action_key: "revoke_admin_mfa_recovery_codes",
    p_permission_key: null,
    p_target_type: "admin_mfa_recovery_codes",
    p_target_id: null,
    p_request_id: input.requestId,
    p_endpoint: null,
    p_method: null,
    p_decision: "allowed",
    p_reason: input.reason,
    p_metadata: input.metadata ?? {}
  });

  await supabaseAdmin.rpc("create_admin_mfa_recovery_code_security_alert", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_alert_key: "admin_mfa_recovery_codes_revoked",
    p_severity: "high",
    p_action_key: "revoke_admin_mfa_recovery_codes",
    p_message: "Admin MFA recovery codes were revoked.",
    p_request_id: input.requestId,
    p_metadata: {
      revokedActiveCount: activeCount ?? 0,
      reason: input.reason,
      ...(input.metadata ?? {})
    }
  });

  return {
    status: "revoked" as const
  };
}

export async function getMyAdminRecoveryCodeStatus(input: { adminAuthUserId: string }) {
  const { data, error } = await supabaseAdmin
    .from("admin_mfa_recovery_code_dashboard")
    .select("*")
    .eq("admin_auth_user_id", input.adminAuthUserId)
    .maybeSingle();

  if (error) throw error;

  return (
    data ?? {
      admin_auth_user_id: input.adminAuthUserId,
      active_recovery_code_count: 0,
      used_recovery_code_count: 0,
      revoked_recovery_code_count: 0,
      last_generated_at: null,
      last_used_at: null
    }
  );
}
