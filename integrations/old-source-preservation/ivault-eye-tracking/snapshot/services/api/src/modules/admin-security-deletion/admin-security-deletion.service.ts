import { supabaseAdmin } from "../../config/supabase";

export async function listSecurityDeletionRequests(input: {
  limit?: number;
  status?: string;
  sourceType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_deletion_request_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.sourceType) {
    query = query.eq("source_type", input.sourceType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getSecurityDeletionIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_deletion_integrity")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createSecurityDeletionRequest(input: {
  adminAuthUserId: string;
  sourceType: string;
  periodStart: string;
  periodEnd: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_deletion_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_source_type: input.sourceType,
      p_period_start: input.periodStart,
      p_period_end: input.periodEnd,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) {
    throw error;
  }

  return {
    adminSecurityDeletionRequestId: String(data),
    status: "pending"
  };
}

export async function approveSecurityDeletionRequest(input: {
  adminAuthUserId: string;
  deletionRequestId: string;
  approvalReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_security_deletion_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_deletion_request_id: input.deletionRequestId,
      p_approval_reason: input.approvalReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) {
    throw error;
  }

  return {
    adminSecurityDeletionRequestId: String(data),
    status: "approved"
  };
}

export async function rejectSecurityDeletionRequest(input: {
  adminAuthUserId: string;
  deletionRequestId: string;
  rejectionReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "reject_admin_security_deletion_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_deletion_request_id: input.deletionRequestId,
      p_rejection_reason: input.rejectionReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) {
    throw error;
  }

  return {
    adminSecurityDeletionRequestId: String(data),
    status: "rejected"
  };
}

export async function executeSecurityDeletionRequest(input: {
  adminAuthUserId: string;
  deletionRequestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "execute_admin_security_deletion_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_deletion_request_id: input.deletionRequestId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) {
    throw error;
  }

  return {
    adminSecurityDeletionRequestId: String(data)
  };
}
