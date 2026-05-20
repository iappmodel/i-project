import { supabaseAdmin } from "../../config/supabase";

export type TrustTransparencyListInput = {
  limit?: number;
  status?: string;
  portalType?: string;
  visibility?: string;
  customerName?: string;
  transparencyPortalId?: string;
};

export async function listTrustTransparencyPortals(input: TrustTransparencyListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_transparency_portal_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.portalType) query = query.eq("portal_type", input.portalType);
  if (input.visibility) query = query.eq("visibility", input.visibility);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustTransparencySections(input: TrustTransparencyListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_transparency_section_dashboard")
    .select("*")
    .order("sort_order", { ascending: true })
    .limit(safeLimit);

  if (input.transparencyPortalId) {
    query = query.eq("transparency_portal_id", input.transparencyPortalId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listPublishedTrustNotices(input: TrustTransparencyListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_published_trust_notice_dashboard")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.transparencyPortalId) {
    query = query.eq("transparency_portal_id", input.transparencyPortalId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listPublishedProofStatus(input: TrustTransparencyListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_published_proof_status_dashboard")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);
  if (input.transparencyPortalId) {
    query = query.eq("transparency_portal_id", input.transparencyPortalId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustTransparencyAccessGrants(input: TrustTransparencyListInput) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_transparency_access_grant_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.transparencyPortalId) {
    query = query.eq("transparency_portal_id", input.transparencyPortalId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrustTransparencyIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_transparency_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTrustTransparencyPortal(input: {
  adminAuthUserId: string;
  portalType: string;
  visibility: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  customerName?: string | null;
  customerDomain?: string | null;
  privateRoomId?: string | null;
  auditorPortalId?: string | null;
  enterpriseReviewRoomId?: string | null;
  requireAuth: boolean;
  allowPublicVerification: boolean;
  allowPackageAccessRequest: boolean;
  brandPayload: Record<string, unknown>;
  contentPayload: Record<string, unknown>;
  requestId: string;
  metadata: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_trust_transparency_portal",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_portal_type: input.portalType,
      p_visibility: input.visibility,
      p_slug: input.slug,
      p_title: input.title,
      p_subtitle: input.subtitle ?? null,
      p_description: input.description ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_private_room_id: input.privateRoomId ?? null,
      p_auditor_portal_id: input.auditorPortalId ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_require_auth: input.requireAuth ?? true,
      p_allow_public_verification: input.allowPublicVerification ?? true,
      p_allow_package_access_request: input.allowPackageAccessRequest ?? false,
      p_brand_payload: input.brandPayload ?? {},
      p_content_payload: input.contentPayload ?? {},
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    transparencyPortalId: String(data),
    status: "draft"
  };
}

export async function publishTrustTransparencyPortal(input: {
  transparencyPortalId: string;
  adminAuthUserId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "publish_admin_security_trust_transparency_portal",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_transparency_portal_id: input.transparencyPortalId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    transparencyPortalId: String(data),
    status: "published"
  };
}

export async function syncTrustTransparencyPortal(input: {
  transparencyPortalId: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("sync_admin_security_trust_transparency_portal", {
    p_transparency_portal_id: input.transparencyPortalId,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

export async function processTrustTransparencyPortals(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("process_admin_security_trust_transparency_portals", {
    p_batch_size: 500,
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

export async function grantTrustTransparencyAccess(input: {
  adminAuthUserId: string;
  transparencyPortalId: string;
  granteeType: string;
  granteeEmail: string;
  granteeDisplayName?: string | null;
  accessLevel: string;
  canViewNotices: boolean;
  canViewProofs: boolean;
  canViewPackages: boolean;
  canRequestPackages: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
  requestId: string;
  metadata: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("grant_admin_security_trust_transparency_access", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_transparency_portal_id: input.transparencyPortalId,
    p_grantee_type: input.granteeType,
    p_grantee_email: input.granteeEmail,
    p_grantee_display_name: input.granteeDisplayName ?? null,
    p_access_level: input.accessLevel ?? "view",
    p_can_view_notices: input.canViewNotices ?? true,
    p_can_view_proofs: input.canViewProofs ?? true,
    p_can_view_packages: input.canViewPackages ?? false,
    p_can_request_packages: input.canRequestPackages ?? false,
    p_max_uses: input.maxUses ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    transparencyAccessGrantId: String(data),
    status: "active"
  };
}
