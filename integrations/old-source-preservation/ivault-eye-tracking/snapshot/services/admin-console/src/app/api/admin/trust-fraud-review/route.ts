import { listTrustFraudReviewBatches } from "@/lib/alphabet/trust-fraud-review/trust-fraud-review-store";
import { requireAdminOrModerator } from "@/lib/api/require-admin";

export async function GET(request: Request) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const batches = listTrustFraudReviewBatches({
    status: searchParams.get("status"),
    severity: searchParams.get("severity"),
    batchScope: searchParams.get("batchScope"),
    limit: Number(searchParams.get("limit") ?? 100)
  });

  return Response.json({ ok: true, batches });
}

export async function POST(request: Request) {
  const denied = requireAdminOrModerator(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { batchDate?: string; batchScope?: string };
    return Response.json({
      ok: true,
      resultPayload: {
        queued: true,
        batchDate: body.batchDate ?? null,
        batchScope: body.batchScope ?? "global_daily"
      },
      reasonCodes: ["trust_fraud_review_batch_requested"]
    });
  } catch {
    return Response.json(
      { ok: false, message: "Trust/fraud review batch could not be generated." },
      { status: 400 }
    );
  }
}
