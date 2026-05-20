export function requireAdmin(request: Request): Response | null {
  if (request.headers.get("x-role") !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Admin Command Center APIs allow moderators to triage; other admin routes stay admin-only. */
export function requireAdminOrModerator(request: Request): Response | null {
  const role = request.headers.get("x-role");
  if (role !== "admin" && role !== "moderator") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
