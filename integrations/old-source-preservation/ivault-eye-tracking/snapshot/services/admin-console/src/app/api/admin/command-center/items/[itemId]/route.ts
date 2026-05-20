import { getAdminCommandItem } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import { requireAdminOrModerator } from "@/lib/api/require-admin";

export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const { itemId } = await context.params;
    const result = await getAdminCommandItem(itemId);

    if (!result) {
      return Response.json({ ok: false, message: "Command item not found." }, { status: 404 });
    }

    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }
}
