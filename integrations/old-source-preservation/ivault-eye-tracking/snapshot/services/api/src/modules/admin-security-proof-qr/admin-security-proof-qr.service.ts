import { supabaseAdmin } from "../../config/supabase";

export async function listProofVerificationLinks(input: {
  limit?: number;
  status?: string;
  proofType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_verification_link_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.proofType) query = query.eq("proof_type", input.proofType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofQrCodes(input: {
  limit?: number;
  status?: string;
  proofType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_qr_code_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.proofType) query = query.eq("proof_type", input.proofType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofQrCodeJobs(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_proof_qr_code_job_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listProofVerificationLinkEvents(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_proof_verification_link_event_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function getProofQrIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_proof_qr_deeplink_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProofVerificationLink(input: {
  proofType: string;
  proofId?: string;
  proofKey?: string;
  title?: string;
  summary?: string;
  baseUrl?: string;
  expiresAt?: string;
  maxUses?: number;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_proof_verification_link",
    {
      p_proof_type: input.proofType,
      p_proof_id: input.proofId ?? null,
      p_proof_key: input.proofKey ?? null,
      p_title: input.title ?? null,
      p_summary: input.summary ?? null,
      p_base_url: input.baseUrl ?? null,
      p_expires_at: input.expiresAt ?? null,
      p_max_uses: input.maxUses ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;
  return data;
}

export async function createProofQrCode(input: {
  verificationLinkId: string;
  qrFormat?: string;
  sizePx?: number;
  includeLogo?: boolean;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_proof_qr_code",
    {
      p_verification_link_id: input.verificationLinkId,
      p_qr_format: input.qrFormat ?? "svg",
      p_size_px: input.sizePx ?? 512,
      p_include_logo: input.includeLogo ?? false,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    proofQrCodeId: String(data),
    status: "pending"
  };
}

export async function revokeProofVerificationLink(input: {
  adminAuthUserId: string;
  verificationLinkId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "revoke_admin_security_proof_verification_link",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_verification_link_id: input.verificationLinkId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    verificationLinkId: String(data),
    status: "revoked"
  };
}
