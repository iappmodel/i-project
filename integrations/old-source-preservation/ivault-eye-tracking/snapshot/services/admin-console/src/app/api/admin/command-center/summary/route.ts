import { getAdminCommandCenterSummary } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import { requireAdminOrModerator } from "@/lib/api/require-admin";

export async function GET(request: Request) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const actorAdminId = request.headers.get("x-user-id");
    const summary = await getAdminCommandCenterSummary(actorAdminId);
    return Response.json({ ok: true, summary });
  } catch {
    return Response.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }
}
