import { supabaseAdmin } from "../../config/supabase";

export async function listLegalHolds(input: {
  limit?: number;
  status?: string;
  holdType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_legal_hold_dashboard")
    .select("*")
    .order("effective_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.holdType) query = query.eq("hold_type", input.holdType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listLegalHoldTargets(input: {
  legalHoldId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_legal_hold_target_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.legalHoldId) {
    query = query.eq("admin_security_legal_hold_id", input.legalHoldId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getLegalHoldIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_legal_hold_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createLegalHold(input: {
  adminAuthUserId: string;
  holdKey: string;
  holdType: string;
  title: string;
  reason: string;
  authority?: string;
  externalReference?: string;
  effectiveAt?: string;
  expiresAt?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_legal_hold",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_hold_key: input.holdKey,
      p_hold_type: input.holdType,
      p_title: input.title,
      p_reason: input.reason,
      p_authority: input.authority ?? null,
      p_external_reference: input.externalReference ?? null,
      p_effective_at: input.effectiveAt ?? null,
      p_expires_at: input.expiresAt ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityLegalHoldId: String(data),
    status: "active"
  };
}

export async function addLegalHoldTarget(input: {
  adminAuthUserId: string;
  legalHoldId: string;
  targetType: string;
  sourceType?: string;
  sourceId?: string;
  periodStart?: string;
  periodEnd?: string;
  adminTargetAuthUserId?: string;
  archiveManifestId?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "add_admin_security_legal_hold_target",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_legal_hold_id: input.legalHoldId,
      p_target_type: input.targetType,
      p_source_type: input.sourceType ?? null,
      p_source_id: input.sourceId ?? null,
      p_period_start: input.periodStart ?? null,
      p_period_end: input.periodEnd ?? null,
      p_target_admin_auth_user_id: input.adminTargetAuthUserId ?? null,
      p_archive_manifest_id: input.archiveManifestId ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityLegalHoldTargetId: String(data)
  };
}

export async function releaseLegalHold(input: {
  adminAuthUserId: string;
  legalHoldId: string;
  releaseReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "release_admin_security_legal_hold",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_legal_hold_id: input.legalHoldId,
      p_release_reason: input.releaseReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityLegalHoldId: String(data),
    status: "released"
  };
}
