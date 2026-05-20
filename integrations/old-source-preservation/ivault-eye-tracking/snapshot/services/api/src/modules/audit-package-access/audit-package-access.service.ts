import { supabaseAdmin } from "../../config/supabase";

export async function resolveAuditPackageAccess(input: {
  token: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "resolve_admin_security_audit_package_access_token",
    {
      p_access_token: input.token,
      p_ip_address: input.ipAddress ?? null,
      p_user_agent: input.userAgent ?? null,
      p_request_id: input.requestId
    }
  );

  if (error) throw error;

  const grant = Array.isArray(data) ? data[0] : data;

  if (!grant) {
    throw new Error("audit package access grant not found");
  }

  const auditPackageId = (grant as { audit_package_id: string }).audit_package_id;

  const { data: pkg, error: pkgError } = await supabaseAdmin
    .from("admin_security_audit_package_dashboard")
    .select("*")
    .eq("admin_security_audit_package_id", auditPackageId)
    .maybeSingle();

  if (pkgError) throw pkgError;

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("admin_security_audit_package_item_dashboard")
    .select("*")
    .eq("audit_package_id", auditPackageId)
    .order("sort_order", { ascending: true })
    .limit(500);

  if (itemsError) throw itemsError;

  return {
    grant,
    package: pkg,
    items: items ?? []
  };
}
