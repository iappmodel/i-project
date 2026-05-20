import { applyAdminCommandDecision } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import { isAdminCommandCenterError } from "@/lib/alphabet/admin-command-center/admin-command-center-errors";
import { requireAdminOrModerator } from "@/lib/api/require-admin";
import type { AdminCommandDecisionInput } from "@/types/alphabet/admin-command-center.types";

export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const { itemId } = await context.params;
    const raw: unknown = await request.json();
    const body =
      raw !== null && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Partial<AdminCommandDecisionInput>)
        : {};

    const actorAdminId = request.headers.get("x-user-id");
    if (!actorAdminId) {
      return Response.json({ ok: false, message: "Missing actor." }, { status: 400 });
    }

    const result = await applyAdminCommandDecision({
      ...body,
      commandItemId: itemId,
      actorAdminId,
      actorRole: request.headers.get("x-role") ?? "admin"
    } as AdminCommandDecisionInput);

    return Response.json({ ok: true, result });
  } catch (error) {
    if (isAdminCommandCenterError(error)) {
      return Response.json(
        { ok: false, message: error.message, code: error.code, reasonCodes: error.reasonCodes },
        { status: 400 }
      );
    }
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "Decision failed." },
      { status: 400 }
    );
  }
}
