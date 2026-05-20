import { getAdminReviewCase } from "@/lib/alphabet/admin-review/admin-review-store";
import { requireAdmin } from "@/lib/api/require-admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ reviewCaseId: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { reviewCaseId } = await context.params;
  const reviewCase = getAdminReviewCase(reviewCaseId);

  if (!reviewCase) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ reviewCase });
}
