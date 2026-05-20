import { applyAdminCommandDecision } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import { isAdminCommandCenterError } from "@/lib/alphabet/admin-command-center/admin-command-center-errors";
import { requireAdminOrModerator } from "@/lib/api/require-admin";

export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const { itemId } = await context.params;
    const actorAdminId = request.headers.get("x-user-id");

    if (!actorAdminId) {
      return Response.json({ ok: false, message: "Missing actor." }, { status: 400 });
    }

    let assignToAdminId = actorAdminId;
    const raw = await request.text();
    if (raw.trim()) {
      try {
        const body = JSON.parse(raw) as { assignToAdminId?: string };
        if (body?.assignToAdminId?.trim()) assignToAdminId = body.assignToAdminId.trim();
      } catch {
        return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
      }
    }

    const result = await applyAdminCommandDecision({
      commandItemId: itemId,
      actorAdminId,
      actorRole: request.headers.get("x-role") ?? "admin",
      executableAction: "assign_item",
      decisionType: "item_assignment",
      decisionStatus: "decision_recorded",
      reasonCodes: ["admin_assigned_command_item"],
      evidenceSummary: "Admin assigned command item.",
      linkedObjectIds: {},
      beforeState: {},
      afterState: { assignedToAdminId: assignToAdminId },
      idempotencyKey: `assign:${itemId}:${assignToAdminId}:${actorAdminId}`,
      dedupeKey: `assign:${itemId}:${assignToAdminId}`
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    if (isAdminCommandCenterError(error)) {
      return Response.json(
        { ok: false, message: error.message, code: error.code, reasonCodes: error.reasonCodes },
        { status: 400 }
      );
    }
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "Assignment failed." },
      { status: 400 }
    );
  }
}
