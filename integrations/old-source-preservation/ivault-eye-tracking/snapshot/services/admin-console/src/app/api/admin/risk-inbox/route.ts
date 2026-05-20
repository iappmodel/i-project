import { listRiskInboxAlerts } from "@/lib/alphabet/operational-alerts/operational-alert-store";
import { requireAdmin } from "@/lib/api/require-admin";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);

  const alerts = listRiskInboxAlerts({
    status: searchParams.get("status"),
    severity: searchParams.get("severity"),
    assignedTeam: searchParams.get("assignedTeam"),
    limit: Number(searchParams.get("limit") ?? 100)
  });

  return Response.json({
    ok: true,
    alerts
  });
}
