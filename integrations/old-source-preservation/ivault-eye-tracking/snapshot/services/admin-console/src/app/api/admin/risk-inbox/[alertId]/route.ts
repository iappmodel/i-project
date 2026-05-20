import { getRiskInboxAlert } from "@/lib/alphabet/operational-alerts/operational-alert-store";
import { requireAdmin } from "@/lib/api/require-admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ alertId: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { alertId } = await context.params;
  const alert = getRiskInboxAlert(alertId);

  if (!alert) {
    return Response.json({ ok: false, message: "Alert not found." }, { status: 404 });
  }

  return Response.json({
    ok: true,
    alert
  });
}
