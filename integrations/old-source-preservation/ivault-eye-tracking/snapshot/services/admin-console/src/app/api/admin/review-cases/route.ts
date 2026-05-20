import {
  createAdminReviewCaseInStore,
  listAdminReviewCases
} from "@/lib/alphabet/admin-review/admin-review-store";
import { requireAdmin } from "@/lib/api/require-admin";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const assignedReviewerId = searchParams.get("assignedReviewerId") ?? undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
  const escalationsOnly = searchParams.get("escalationsOnly") === "1";

  const cases = listAdminReviewCases({
    status,
    assignedReviewerId,
    limit,
    escalationsOnly
  });

  return Response.json({ cases });
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const review_case_type = typeof b.review_case_type === "string" ? b.review_case_type : null;
  const review_trigger = typeof b.review_trigger === "string" ? b.review_trigger : null;

  if (!review_case_type || !review_trigger) {
    return Response.json(
      { error: "review_case_type and review_trigger are required." },
      { status: 400 }
    );
  }

  const reviewCase = createAdminReviewCaseInStore({
    review_case_type,
    review_trigger,
    status: typeof b.status === "string" ? b.status : undefined,
    public_summary: typeof b.public_summary === "string" ? b.public_summary : null,
    internal_summary: typeof b.internal_summary === "string" ? b.internal_summary : null,
    severity: typeof b.severity === "string" ? b.severity : undefined,
    priority: typeof b.priority === "string" ? b.priority : undefined,
    user_id: typeof b.user_id === "string" ? b.user_id : null,
    wallet_id: typeof b.wallet_id === "string" ? b.wallet_id : null,
    redacted_evidence: b.redacted_evidence,
    raw_evidence: b.raw_evidence
  });

  return Response.json({ reviewCase }, { status: 201 });
}
