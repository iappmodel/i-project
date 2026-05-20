import { createAdminCommandItem, listAdminCommandItems } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import { requireAdminOrModerator } from "@/lib/api/require-admin";
import type { AdminCommandItemInput } from "@/types/alphabet/admin-command-center.types";

export async function GET(request: Request) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);

    const items = await listAdminCommandItems({
      status: searchParams.get("status"),
      severity: searchParams.get("severity"),
      priority: searchParams.get("priority"),
      queueScope: searchParams.get("queueScope"),
      assignedToAdminId: searchParams.get("assignedToAdminId"),
      limit: Number(searchParams.get("limit") ?? 100)
    });

    return Response.json({ ok: true, items });
  } catch {
    return Response.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const raw: unknown = await request.json();
    const body =
      raw !== null && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Partial<AdminCommandItemInput>)
        : {};

    const item = await createAdminCommandItem({
      ...body,
      metadata: {
        ...(typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata)
          ? (body.metadata as Record<string, unknown>)
          : {}),
        createdByAdminId: request.headers.get("x-user-id") ?? null
      }
    } as AdminCommandItemInput);

    return Response.json({ ok: true, item });
  } catch {
    return Response.json({ ok: false, message: "Command item could not be created." }, { status: 400 });
  }
}
