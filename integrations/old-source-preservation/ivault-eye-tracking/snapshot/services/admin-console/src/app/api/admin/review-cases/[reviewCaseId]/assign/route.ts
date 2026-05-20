import { assignAdminReviewCaseInStore } from "@/lib/alphabet/admin-review/admin-review-store";
import { requireAdmin } from "@/lib/api/require-admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ reviewCaseId: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { reviewCaseId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const assignedReviewerId =
    typeof b.assignedReviewerId === "string"
      ? b.assignedReviewerId
      : request.headers.get("x-user-id");

  if (!assignedReviewerId) {
    return Response.json({ error: "assignedReviewerId is required." }, { status: 400 });
  }

  const assignedTeam = typeof b.assignedTeam === "string" ? b.assignedTeam : null;

  const reviewCase = assignAdminReviewCaseInStore({
    reviewCaseId,
    assignedReviewerId,
    assignedTeam
  });

  if (!reviewCase) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    reviewCase,
    audit: {
      kind: "review_assigned",
      message: "Assignment recorded. Downstream workers consume authoritative store."
    }
  });
}
