import { syncCommandCenterQueueFromSources } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import { requireAdminOrModerator } from "@/lib/api/require-admin";

export async function POST(request: Request) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const result = await syncCommandCenterQueueFromSources();
    return Response.json({ ok: true, result });
  } catch {
    return Response.json({ ok: false, message: "Command Center sync failed." }, { status: 400 });
  }
}
