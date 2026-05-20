import { supabaseAdmin } from "../../config/supabase";
import {
  generateBreakGlassToken,
  hashBreakGlassToken
} from "./admin-break-glass.token";

export async function listAdminBreakGlassRequests(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_break_glass_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAdminBreakGlassIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_break_glass_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAdminBreakGlassRequest(input: {
  requestedByAuthUserId: string;
  targetAdminAuthUserId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const token = generateBreakGlassToken();
  const tokenHash = hashBreakGlassToken({ token });

  const { data, error } = await supabaseAdmin.rpc(
    "request_admin_break_glass_access",
    {
      p_requested_by_auth_user_id: input.requestedByAuthUserId,
      p_target_auth_user_id: input.targetAdminAuthUserId,
      p_reason: input.reason,
      p_token_hash: tokenHash,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminBreakGlassRequestId: String(data),
    token,
    warning: "Save this break-glass token now. It will not be shown again."
  };
}

export async function approveAdminBreakGlassRequest(input: {
  approvedByAuthUserId: string;
  breakGlassRequestId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_break_glass_request",
    {
      p_approved_by_auth_user_id: input.approvedByAuthUserId,
      p_break_glass_request_id: input.breakGlassRequestId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminBreakGlassRequestId: String(data),
    status: "approved" as const
  };
}

export async function rejectAdminBreakGlassRequest(input: {
  rejectedByAuthUserId: string;
  breakGlassRequestId: string;
  rejectionReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "reject_admin_break_glass_request",
    {
      p_rejected_by_auth_user_id: input.rejectedByAuthUserId,
      p_break_glass_request_id: input.breakGlassRequestId,
      p_rejection_reason: input.rejectionReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminBreakGlassRequestId: String(data),
    status: "rejected" as const
  };
}

export async function executeAdminBreakGlassRequest(input: {
  executedByAuthUserId: string;
  breakGlassRequestId: string;
  token: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const tokenHash = hashBreakGlassToken({ token: input.token });

  const { data, error } = await supabaseAdmin.rpc(
    "execute_admin_break_glass_request",
    {
      p_executed_by_auth_user_id: input.executedByAuthUserId,
      p_break_glass_request_id: input.breakGlassRequestId,
      p_token_hash: tokenHash,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminBreakGlassRequestId: String(data),
    status: "executed" as const
  };
}
