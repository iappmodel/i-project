import { escalateRiskInboxAlert } from "@/lib/alphabet/operational-alerts/operational-alert-store";
import { requireAdmin } from "@/lib/api/require-admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ alertId: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { alertId } = await context.params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const b = body as Record<string, unknown>;
  const reasonCodes = Array.isArray(b.reasonCodes)
    ? (b.reasonCodes as string[])
    : typeof b.reasonCodes === "string"
      ? [b.reasonCodes]
      : ["manual_escalation"];

  const alert = escalateRiskInboxAlert({
    alertId,
    actorUserId: request.headers.get("x-user-id") ?? (typeof b.actorUserId === "string" ? b.actorUserId : "system"),
    reasonCodes
  });

  if (!alert) {
    return Response.json({ ok: false, message: "Alert not found." }, { status: 404 });
  }

  return Response.json({
    ok: true,
    alert
  });
}
