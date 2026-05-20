import { acknowledgeRiskInboxAlert } from "@/lib/alphabet/operational-alerts/operational-alert-store";
import { requireAdmin } from "@/lib/api/require-admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ alertId: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { alertId } = await context.params;
  const actorUserId = request.headers.get("x-user-id") ?? "system";

  const alert = acknowledgeRiskInboxAlert({
    alertId,
    actorUserId
  });

  if (!alert) {
    return Response.json({ ok: false, message: "Alert not found." }, { status: 404 });
  }

  return Response.json({
    ok: true,
    alert
  });
}
