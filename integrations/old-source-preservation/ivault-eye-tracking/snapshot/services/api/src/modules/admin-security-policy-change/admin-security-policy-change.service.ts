import { supabaseAdmin } from "../../config/supabase";

export async function listPolicyChangeRequests(input: {
  limit?: number;
  status?: string;
  changeType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_policy_change_request_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.changeType) query = query.eq("change_type", input.changeType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listPolicyChangeReviews(input: {
  changeRequestId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_policy_change_review_dashboard")
    .select("*")
    .order("reviewed_at", { ascending: false })
    .limit(safeLimit);

  if (input.changeRequestId) {
    query = query.eq("admin_security_policy_change_request_id", input.changeRequestId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getPolicyChangeIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_policy_change_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createPolicyChangeRequest(input: {
  adminAuthUserId: string;
  changeType: string;
  changeKey: string;
  title: string;
  rationale: string;
  targetPolicyId?: string;
  policyKey?: string;
  policyName?: string;
  category?: string;
  severity?: string;
  ownerTeam?: string;
  description?: string;
  riskLevel?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_policy_change_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_change_type: input.changeType,
      p_change_key: input.changeKey,
      p_title: input.title,
      p_rationale: input.rationale,
      p_target_policy_id: input.targetPolicyId ?? null,
      p_policy_key: input.policyKey ?? null,
      p_policy_name: input.policyName ?? null,
      p_category: input.category ?? null,
      p_severity: input.severity ?? "high",
      p_owner_team: input.ownerTeam ?? "platform",
      p_description: input.description ?? null,
      p_risk_level: input.riskLevel ?? "high",
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicyChangeRequestId: String(data),
    status: "draft"
  };
}

export async function submitPolicyChangeRequest(input: {
  adminAuthUserId: string;
  changeRequestId: string;
  note?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "submit_admin_security_policy_change_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_change_request_id: input.changeRequestId,
      p_note: input.note ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicyChangeRequestId: String(data),
    status: "submitted"
  };
}

export async function reviewPolicyChangeRequest(input: {
  adminAuthUserId: string;
  changeRequestId: string;
  reviewStatus: string;
  reviewNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "review_admin_security_policy_change_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_change_request_id: input.changeRequestId,
      p_review_status: input.reviewStatus,
      p_review_note: input.reviewNote,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicyChangeReviewId: String(data)
  };
}

export async function approvePolicyChangeRequest(input: {
  adminAuthUserId: string;
  changeRequestId: string;
  approvalNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_security_policy_change_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_change_request_id: input.changeRequestId,
      p_approval_note: input.approvalNote,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicyChangeRequestId: String(data),
    status: "approved"
  };
}

export async function rejectPolicyChangeRequest(input: {
  adminAuthUserId: string;
  changeRequestId: string;
  rejectionReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "reject_admin_security_policy_change_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_change_request_id: input.changeRequestId,
      p_rejection_reason: input.rejectionReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicyChangeRequestId: String(data),
    status: "rejected"
  };
}

export async function activatePolicyChangeRequest(input: {
  adminAuthUserId: string;
  changeRequestId: string;
  activationNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "activate_admin_security_policy_change_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_change_request_id: input.changeRequestId,
      p_activation_note: input.activationNote,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicyChangeRequestId: String(data),
    status: "activated"
  };
}

export async function cancelPolicyChangeRequest(input: {
  adminAuthUserId: string;
  changeRequestId: string;
  cancelReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "cancel_admin_security_policy_change_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_change_request_id: input.changeRequestId,
      p_cancel_reason: input.cancelReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicyChangeRequestId: String(data),
    status: "cancelled"
  };
}

export async function runPolicyChangeSimulation(input: {
  adminAuthUserId: string;
  changeRequestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "run_admin_security_policy_change_simulation",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_policy_change_request_id: input.changeRequestId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityPolicySimulationRunId: String(data)
  };
}

export async function listPolicySimulationRuns(input: {
  limit?: number;
  status?: string;
  policyChangeRequestId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_policy_simulation_run_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.policyChangeRequestId) {
    query = query.eq("policy_change_request_id", input.policyChangeRequestId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listPolicySimulationItems(input: {
  limit?: number;
  simulationRunId?: string;
  resultStatus?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_policy_simulation_item_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.simulationRunId) {
    query = query.eq("admin_security_policy_simulation_run_id", input.simulationRunId);
  }

  if (input.resultStatus) {
    query = query.eq("result_status", input.resultStatus);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getPolicySimulationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_policy_simulation_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}
