import { addAdminCommandNote } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import { requireAdminOrModerator } from "@/lib/api/require-admin";

export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const { itemId } = await context.params;
    const body = (await request.json()) as {
      noteBody?: string;
      visibility?: string;
      evidenceRefs?: unknown;
    };

    const actorAdminId = request.headers.get("x-user-id");

    if (!actorAdminId) {
      return Response.json({ ok: false, message: "Missing actor." }, { status: 400 });
    }

    if (!body.noteBody?.trim()) {
      return Response.json({ ok: false, message: "noteBody is required." }, { status: 400 });
    }

    const note = await addAdminCommandNote({
      commandItemId: itemId,
      actorAdminId,
      actorRole: request.headers.get("x-role") ?? "admin",
      noteBody: body.noteBody.trim(),
      visibility: body.visibility ?? "internal",
      evidenceRefs: body.evidenceRefs ?? []
    });

    return Response.json({ ok: true, note });
  } catch {
    return Response.json({ ok: false, message: "Note could not be added." }, { status: 400 });
  }
}
