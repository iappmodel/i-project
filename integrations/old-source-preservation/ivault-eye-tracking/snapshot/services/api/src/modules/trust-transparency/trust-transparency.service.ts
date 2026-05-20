import { supabaseAdmin } from "../../config/supabase";

export async function getPublishedTrustPortalBySlug(input: {
  slug: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { data: portal, error } = await supabaseAdmin
    .from("admin_security_trust_transparency_portal_public_view")
    .select("*")
    .eq("slug", input.slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  if (!portal) throw new Error("transparency portal not found");

  if (portal.visibility !== "public" && portal.require_auth) {
    throw new Error("transparency portal requires access token");
  }

  const portalId = portal.admin_security_trust_transparency_portal_id as string;

  const [sections, notices, proofs] = await Promise.all([
    supabaseAdmin
      .from("admin_security_trust_transparency_section_dashboard")
      .select("*")
      .eq("transparency_portal_id", portalId)
      .eq("status", "active")
      .eq("visible_to_public", true)
      .order("sort_order", { ascending: true }),

    supabaseAdmin
      .from("admin_security_published_trust_notice_dashboard")
      .select("*")
      .eq("transparency_portal_id", portalId)
      .eq("status", "published")
      .eq("public_visible", true)
      .order("published_at", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("admin_security_published_proof_status_dashboard")
      .select("*")
      .eq("transparency_portal_id", portalId)
      .eq("status", "published")
      .eq("public_visible", true)
      .order("published_at", { ascending: false })
      .limit(100)
  ]);

  if (sections.error) throw sections.error;
  if (notices.error) throw notices.error;
  if (proofs.error) throw proofs.error;

  await supabaseAdmin.rpc("record_admin_security_trust_transparency_event", {
    p_event_type: "portal_viewed",
    p_event_action: "viewed",
    p_transparency_portal_id: portalId,
    p_transparency_access_grant_id: null,
    p_actor_type: "anonymous",
    p_actor_auth_user_id: null,
    p_actor_admin_user_id: null,
    p_actor_email: null,
    p_source_type: "admin_security_trust_transparency_portal",
    p_source_id: portalId,
    p_source_key: portal.transparency_portal_key,
    p_title: "Transparency portal viewed",
    p_summary: null,
    p_ip_address: input.ipAddress ?? null,
    p_user_agent: input.userAgent ?? null,
    p_request_id: input.requestId,
    p_metadata: {}
  });

  return {
    portal,
    sections: sections.data ?? [],
    notices: notices.data ?? [],
    proofs: proofs.data ?? []
  };
}

export async function getTrustPortalByAccessToken(input: {
  token: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "resolve_admin_security_trust_transparency_access_token",
    {
      p_access_token: input.token,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId
    }
  );

  if (error) throw error;

  const grant = Array.isArray(data) ? data[0] : data;
  if (!grant) throw new Error("transparency portal access grant not found");

  const portalId = grant.transparency_portal_id as string;

  const { data: portal, error: portalError } = await supabaseAdmin
    .from("admin_security_trust_transparency_portal_public_view")
    .select("*")
    .eq("admin_security_trust_transparency_portal_id", portalId)
    .maybeSingle();

  if (portalError) throw portalError;
  if (!portal) throw new Error("transparency portal not found");

  const [sections, notices, proofs] = await Promise.all([
    supabaseAdmin
      .from("admin_security_trust_transparency_section_dashboard")
      .select("*")
      .eq("transparency_portal_id", portalId)
      .eq("status", "active")
      .order("sort_order", { ascending: true }),

    supabaseAdmin
      .from("admin_security_published_trust_notice_dashboard")
      .select("*")
      .eq("transparency_portal_id", portalId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("admin_security_published_proof_status_dashboard")
      .select("*")
      .eq("transparency_portal_id", portalId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100)
  ]);

  if (sections.error) throw sections.error;
  if (notices.error) throw notices.error;
  if (proofs.error) throw proofs.error;

  return {
    grant,
    portal,
    sections: sections.data ?? [],
    notices: grant.can_view_notices ? (notices.data ?? []) : [],
    proofs: grant.can_view_proofs ? (proofs.data ?? []) : []
  };
}
