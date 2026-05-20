import { supabaseAdmin } from "../../config/supabase";

export async function listAuditPackageRequests(input: {
  limit?: number;
  status?: string;
  requestType?: string;
  requestScope?: string;
  customerName?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_audit_package_request_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.requestType) query = query.eq("request_type", input.requestType);
  if (input.requestScope) query = query.eq("request_scope", input.requestScope);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAuditPackages(input: {
  limit?: number;
  status?: string;
  packageType?: string;
  customerName?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_audit_package_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.packageType) query = query.eq("package_type", input.packageType);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAuditPackageItems(input: {
  auditPackageId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 500);

  let query = supabaseAdmin
    .from("admin_security_audit_package_item_dashboard")
    .select("*")
    .order("sort_order", { ascending: true })
    .limit(safeLimit);

  if (input.auditPackageId) {
    query = query.eq("audit_package_id", input.auditPackageId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAuditPackageAccessGrants(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_audit_package_access_grant_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAuditPackageIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_audit_package_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAuditPackageRequest(input: {
  adminAuthUserId: string;
  requestType: string;
  requestScope: string;
  title: string;
  description?: string | null;
  customerName?: string | null;
  customerDomain?: string | null;
  privateRoomId?: string | null;
  auditorPortalId?: string | null;
  enterpriseReviewRoomId?: string | null;
  incidentId?: string | null;
  legalHoldId?: string | null;
  governanceViolationId?: string | null;
  retentionSubjectId?: string | null;
  includeRawPayloads?: boolean;
  includeRedactedOnly?: boolean;
  requestReason?: string | null;
  externalReference?: string | null;
  requireApproval?: boolean;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_audit_package_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_request_type: input.requestType,
      p_request_scope: input.requestScope,
      p_title: input.title,
      p_description: input.description ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_incident_id: input.incidentId ?? null,
      p_legal_hold_id: input.legalHoldId ?? null,
      p_governance_violation_id: input.governanceViolationId ?? null,
      p_retention_subject_id: input.retentionSubjectId ?? null,
      p_include_raw_payloads: input.includeRawPayloads ?? false,
      p_include_redacted_only: input.includeRedactedOnly ?? true,
      p_request_reason: input.requestReason ?? null,
      p_external_reference: input.externalReference ?? null,
      p_require_approval: input.requireApproval ?? true,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    auditPackageRequestId: String(data)
  };
}

export async function approveAuditPackageRequest(input: {
  adminAuthUserId: string;
  auditPackageRequestId: string;
  approvalNote?: string | null;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "approve_admin_security_audit_package_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_audit_package_request_id: input.auditPackageRequestId,
      p_approval_note: input.approvalNote ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    auditPackageRequestId: String(data),
    status: "approved"
  };
}

export async function rejectAuditPackageRequest(input: {
  adminAuthUserId: string;
  auditPackageRequestId: string;
  rejectionReason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "reject_admin_security_audit_package_request",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_audit_package_request_id: input.auditPackageRequestId,
      p_rejection_reason: input.rejectionReason,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    auditPackageRequestId: String(data),
    status: "rejected"
  };
}

export async function processAuditPackages(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc(
    "process_approved_admin_security_audit_package_requests",
    {
      p_batch_size: 100,
      p_worker_id: "admin-api",
      p_request_id: input.requestId,
      p_metadata: { source: "admin-api" }
    }
  );

  if (error) throw error;
  return data;
}

export async function verifyAuditPackage(input: {
  auditPackageId: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "verify_admin_security_audit_package_integrity",
    {
      p_audit_package_id: input.auditPackageId,
      p_request_id: input.requestId,
      p_metadata: { source: "admin-api" }
    }
  );

  if (error) throw error;
  return data;
}

export async function grantAuditPackageAccess(input: {
  adminAuthUserId: string;
  auditPackageId: string;
  granteeType: string;
  granteeEmail: string;
  granteeDisplayName?: string | null;
  accessLevel?: string;
  canDownload?: boolean;
  canVerify?: boolean;
  canShare?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "grant_admin_security_audit_package_access",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_audit_package_id: input.auditPackageId,
      p_grantee_type: input.granteeType,
      p_grantee_email: input.granteeEmail,
      p_grantee_display_name: input.granteeDisplayName ?? null,
      p_access_level: input.accessLevel ?? "view",
      p_can_download: input.canDownload ?? true,
      p_can_verify: input.canVerify ?? true,
      p_can_share: input.canShare ?? false,
      p_max_uses: input.maxUses ?? null,
      p_expires_at: input.expiresAt ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    auditPackageAccessGrantId: String(data),
    status: "active"
  };
}
