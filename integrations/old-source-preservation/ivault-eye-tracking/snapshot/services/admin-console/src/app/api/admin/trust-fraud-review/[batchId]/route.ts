import { getTrustFraudReviewBatch } from "@/lib/alphabet/trust-fraud-review/trust-fraud-review-store";
import { requireAdminOrModerator } from "@/lib/api/require-admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ batchId: string }> }
) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  const { batchId } = await context.params;
  const batch = getTrustFraudReviewBatch(batchId);
  if (!batch) {
    return Response.json({ ok: false, message: "Batch not found." }, { status: 404 });
  }

  return Response.json({ ok: true, batch });
}
