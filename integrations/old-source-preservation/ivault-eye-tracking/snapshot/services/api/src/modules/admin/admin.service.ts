import { supabaseAdmin } from "../../config/supabase";
import { getAdminAlertDeliveryConfigStatus } from "../admin-alert-delivery/admin-alert-delivery.config-status";
import {
  mapAdminDeviceRow,
  mapAdminMoneyIntegrityRow,
  mapAdminNetworkRiskObservationRow,
  mapAdminSchedulerJobRow,
  mapAdminSessionRiskEventRow,
  mapAdminSystemCommandCenterRow,
  mapAdminTrustComponentRow,
  mapAdminTrustUserRow
} from "./admin.mapper";

export async function getAdminSystemCommandCenter() {
  const { data, error } = await supabaseAdmin
    .from("admin_system_command_center")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapAdminSystemCommandCenterRow(data);
}

export async function getAdminMoneyIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_money_integrity")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapAdminMoneyIntegrityRow(data);
}

export async function getAdminAuditHashIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_audit_hash_integrity")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAdminSchedulerDashboard() {
  const { data, error } = await supabaseAdmin
    .from("admin_scheduler_dashboard")
    .select("*")
    .order("job_key");

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAdminSchedulerJobRow);
}

export async function approveWithdrawalReview(input: {
  adminAuthUserId: string;
  withdrawalRequestId: string;
  reviewNote: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("admin_approve_withdrawal_review", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_withdrawal_request_id: input.withdrawalRequestId,
    p_review_note: input.reviewNote,
    p_request_id: input.requestId,
    p_metadata: {}
  });

  if (error) {
    throw error;
  }

  return {
    withdrawalRequestId: String(data),
    status: "approved" as const
  };
}

export async function blockWithdrawalReview(input: {
  adminAuthUserId: string;
  withdrawalRequestId: string;
  reviewNote: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("admin_block_withdrawal_review", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_withdrawal_request_id: input.withdrawalRequestId,
    p_review_note: input.reviewNote,
    p_request_id: input.requestId,
    p_metadata: {}
  });

  if (error) {
    throw error;
  }

  return {
    withdrawalRequestId: String(data),
    status: "cancelled" as const
  };
}

export async function getWithdrawalReviewQueue() {
  const { data, error } = await supabaseAdmin
    .from("admin_withdrawal_review_queue")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getAdminUserTrustDetail(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_user_trust_score_detail")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return mapAdminTrustUserRow(data);
}

export async function getAdminUserTrustComponents(
  userId: string,
  limit = 50
) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("user_trust_score_components")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return (data ?? []).map(mapAdminTrustComponentRow);
}

export async function addAdminTrustComponent(input: {
  adminAuthUserId: string;
  userId: string;
  componentKey: string;
  componentCategory: string;
  scoreDelta: number;
  riskDelta: number;
  weight: number;
  reasonCode: string;
  reasonMessage?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("admin_add_trust_score_component", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_target_user_id: input.userId,
    p_component_key: input.componentKey,
    p_component_category: input.componentCategory,
    p_score_delta: input.scoreDelta,
    p_risk_delta: input.riskDelta,
    p_weight: input.weight,
    p_reason_code: input.reasonCode,
    p_reason_message: input.reasonMessage ?? null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    trustComponentId: String(data)
  };
}

export async function getAdminUserRiskDevices(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_user_device_detail")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map(mapAdminDeviceRow);
}

export async function getAdminSecurityDevices(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_device_detail_dashboard")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function trustAdminSecurityDevice(input: {
  adminAuthUserId: string;
  deviceId: string;
  reasonMessage: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_trust_admin_device",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_device_id: input.deviceId,
      p_reason_message: input.reasonMessage,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminDeviceId: String(data),
    status: "trusted" as const
  };
}

export async function markAdminSecurityDeviceSuspicious(input: {
  adminAuthUserId: string;
  deviceId: string;
  reasonMessage: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_mark_admin_device_suspicious",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_device_id: input.deviceId,
      p_reason_message: input.reasonMessage,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminDeviceId: String(data),
    status: "suspicious" as const
  };
}

export async function blockAdminSecurityDevice(input: {
  adminAuthUserId: string;
  deviceId: string;
  reasonMessage: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_block_admin_device",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_device_id: input.deviceId,
      p_reason_message: input.reasonMessage,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminDeviceId: String(data),
    status: "blocked" as const
  };
}

export async function revokeAdminSecurityDevice(input: {
  adminAuthUserId: string;
  deviceId: string;
  reasonMessage: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_revoke_admin_device",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_device_id: input.deviceId,
      p_reason_message: input.reasonMessage,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminDeviceId: String(data),
    status: "revoked" as const
  };
}

export async function getAdminDevice(deviceId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_user_device_detail")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) throw error;

  return data ? mapAdminDeviceRow(data) : null;
}

export async function updateAdminDeviceStatus(input: {
  adminAuthUserId: string;
  deviceId: string;
  status: string;
  reviewedBy: string;
  reasonCode: string;
  reasonMessage: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("admin_update_device_status", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_device_id: input.deviceId,
    p_status: input.status,
    p_reviewed_by: input.reviewedBy,
    p_reason_code: input.reasonCode,
    p_reason_message: input.reasonMessage,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    deviceId: String(data),
    status: input.status
  };
}

export async function getAdminActionAuditLog(limit = 50) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_action_audit_dashboard")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return data ?? [];
}

export async function getAdminSessionRiskEvents(input: {
  limit?: number;
  userId?: string;
  decision?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_user_session_risk_detail")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(safeLimit);

  if (input.userId) {
    query = query.eq("user_id", input.userId);
  }

  if (input.decision) {
    query = query.eq("decision", input.decision);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map(mapAdminSessionRiskEventRow);
}

export async function getAdminSessionRisks(input: {
  limit?: number;
  decision?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_session_risk_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.decision) {
    query = query.eq("decision", input.decision);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getAdminSessionControls(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_session_control_dashboard")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getAdminSessionIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_session_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function forceAdminSessionReauth(input: {
  adminAuthUserId: string;
  targetAdminAuthUserId: string;
  sessionId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_force_session_reauth",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_target_admin_auth_user_id: input.targetAdminAuthUserId,
      p_session_id: input.sessionId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSessionControlId: String(data),
    status: "reauth_required" as const
  };
}

export async function revokeAdminSession(input: {
  adminAuthUserId: string;
  targetAdminAuthUserId: string;
  sessionId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("admin_revoke_session", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_target_admin_auth_user_id: input.targetAdminAuthUserId,
    p_session_id: input.sessionId,
    p_reason: input.reason,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSessionControlId: String(data),
    status: "revoked" as const
  };
}

export async function revokeAllAdminSessions(input: {
  adminAuthUserId: string;
  targetAdminAuthUserId: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_revoke_all_sessions_for_admin",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_target_admin_auth_user_id: input.targetAdminAuthUserId,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    revokedSessionCount: Number(data ?? 0)
  };
}

export async function completeAdminSessionReauth(input: {
  adminAuthUserId: string;
  sessionId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "complete_admin_session_reauth",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_session_id: input.sessionId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSessionControlId: String(data),
    status: "active" as const
  };
}

export async function getAdminNetworkRiskObservations(input: {
  limit?: number;
  userId?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_user_network_risk_detail")
    .select("*")
    .order("observed_at", { ascending: false })
    .limit(safeLimit);

  if (input.userId) {
    query = query.eq("user_id", input.userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map(mapAdminNetworkRiskObservationRow);
}

export async function getAdminActionRisks(input: {
  limit?: number;
  decision?: string;
  actionKey?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_action_risk_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.decision) {
    query = query.eq("decision", input.decision);
  }

  if (input.actionKey) {
    query = query.eq("action_key", input.actionKey);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getAdminMe(authUserId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_user_role_summary")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getAdminPrivilegedActionRequests(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_privileged_action_request_detail")
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

export async function approvePrivilegedAction(input: {
  adminAuthUserId: string;
  privilegedActionRequestId: string;
  approvalNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_privileged_action",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_privileged_action_request_id: input.privilegedActionRequestId,
      p_approval_note: input.approvalNote,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    privilegedActionRequestId: String(data),
    status: "executed" as const
  };
}

export async function rejectPrivilegedAction(input: {
  adminAuthUserId: string;
  privilegedActionRequestId: string;
  rejectionReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "reject_admin_privileged_action",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_privileged_action_request_id: input.privilegedActionRequestId,
      p_rejection_reason: input.rejectionReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    privilegedActionRequestId: String(data),
    status: "rejected" as const
  };
}

export async function getAdminSecurityAlerts(input: {
  limit?: number;
  status?: string;
  severity?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_alert_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.severity) {
    query = query.eq("severity", input.severity);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function acknowledgeAdminSecurityAlert(input: {
  adminAuthUserId: string;
  alertId: string;
  note?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "acknowledge_admin_security_alert",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_admin_security_alert_event_id: input.alertId,
      p_note: input.note ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityAlertEventId: String(data),
    status: "acknowledged" as const
  };
}

export async function resolveAdminSecurityAlert(input: {
  adminAuthUserId: string;
  alertId: string;
  resolutionNote: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("resolve_admin_security_alert", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_admin_security_alert_event_id: input.alertId,
    p_resolution_note: input.resolutionNote,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAlertEventId: String(data),
    status: "resolved" as const
  };
}

export async function dismissAdminSecurityAlert(input: {
  adminAuthUserId: string;
  alertId: string;
  dismissalReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("dismiss_admin_security_alert", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_admin_security_alert_event_id: input.alertId,
    p_dismissal_reason: input.dismissalReason,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminSecurityAlertEventId: String(data),
    status: "dismissed" as const
  };
}

export async function getAdminSecurityAlertDeliveries(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_alert_delivery_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("delivery_status", input.status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getAdminSecurityAlertDeliveryIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_alert_delivery_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getAdminSecurityAlertEscalations(input: {
  limit?: number;
  escalationKey?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_alert_escalation_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.escalationKey) {
    query = query.eq("escalation_key", input.escalationKey);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getAdminSecurityAlertEscalationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_alert_escalation_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getAdminSecurityAlertDeliveryConfigStatus() {
  return getAdminAlertDeliveryConfigStatus();
}

export async function getAdminUsers(limit = 50) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_user_management_detail")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return data ?? [];
}

export async function getAdminRoles() {
  const { data, error } = await supabaseAdmin
    .from("admin_role_catalog")
    .select("*")
    .order("role_key", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function upsertAdminUserAction(input: {
  adminAuthUserId: string;
  targetAuthUserId: string;
  email?: string;
  displayName?: string;
  status: "active" | "suspended" | "revoked";
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_upsert_admin_user",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_target_auth_user_id: input.targetAuthUserId,
      p_email: input.email ?? null,
      p_display_name: input.displayName ?? null,
      p_status: input.status,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminUserId: String(data)
  };
}

export async function assignAdminRoleAction(input: {
  adminAuthUserId: string;
  targetAuthUserId: string;
  roleKey: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_assign_admin_role",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_target_auth_user_id: input.targetAuthUserId,
      p_role_key: input.roleKey,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminRoleAssignmentId: String(data)
  };
}

export async function revokeAdminRoleAction(input: {
  adminAuthUserId: string;
  targetAuthUserId: string;
  roleKey: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_revoke_admin_role",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_target_auth_user_id: input.targetAuthUserId,
      p_role_key: input.roleKey,
      p_reason: input.reason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminRoleAssignmentId: String(data)
  };
}

export async function createAdminMfaChallenge(input: {
  adminAuthUserId: string;
  challengeType: string;
  purpose: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("create_admin_mfa_challenge", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_challenge_type: input.challengeType,
    p_purpose: input.purpose,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminMfaChallengeId: String(data),
    status: "pending" as const
  };
}

export async function verifyAdminMfaChallenge(input: {
  adminAuthUserId: string;
  challengeId: string;
  code: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  if (process.env.ADMIN_MFA_STUB_ENABLED !== "true") {
    throw new Error("stub admin MFA verification is disabled");
  }

  const { data, error } = await supabaseAdmin.rpc("verify_admin_mfa_challenge_stub", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_challenge_id: input.challengeId,
    p_code: input.code,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    adminMfaVerificationId: String(data),
    status: "verified" as const
  };
}

export async function getAdminMfaStatus(adminAuthUserId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_mfa_status_detail")
    .select("*")
    .eq("admin_auth_user_id", adminAuthUserId)
    .maybeSingle();

  if (error) throw error;

  return data;
}
