import { supabaseAdmin } from "../../config/supabase";

export async function listDisclosurePackages(input: {
  limit?: number;
  status?: string;
  disclosureType?: string;
  sourceType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_disclosure_package_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.disclosureType) query = query.eq("disclosure_type", input.disclosureType);
  if (input.sourceType) query = query.eq("source_type", input.sourceType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listDisclosurePackageItems(input: {
  packageId?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_disclosure_package_item_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.packageId) query = query.eq("disclosure_package_id", input.packageId);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getDisclosurePackageIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_disclosure_package_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createDisclosurePackage(input: {
  adminAuthUserId: string;
  disclosureType: string;
  riskLevel?: string;
  sourceType: string;
  sourceId: string;
  publicationTargetType: string;
  publicationTargetId?: string;
  title: string;
  summary: string;
  customerName?: string;
  customerDomain?: string;
  enterpriseReviewRoomId?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_disclosure_package",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_disclosure_type: input.disclosureType,
      p_risk_level: input.riskLevel ?? "medium",
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_publication_target_type: input.publicationTargetType,
      p_publication_target_id: input.publicationTargetId ?? null,
      p_title: input.title,
      p_summary: input.summary,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_enterprise_review_room_id: input.enterpriseReviewRoomId ?? null,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    disclosurePackageId: String(data),
    status: "active"
  };
}
