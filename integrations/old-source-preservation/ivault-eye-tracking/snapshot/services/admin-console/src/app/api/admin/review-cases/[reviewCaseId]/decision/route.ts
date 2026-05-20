import { applyAdminReviewDecisionInStore } from "@/lib/alphabet/admin-review/admin-review-store";
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
  const decision = typeof b.decision === "string" ? b.decision : null;
  const decidedByUserId =
    typeof b.decidedByUserId === "string" ? b.decidedByUserId : request.headers.get("x-user-id");

  if (!decision) {
    return Response.json({ error: "decision is required." }, { status: 400 });
  }

  if (!decidedByUserId) {
    return Response.json({ error: "decidedByUserId (or x-user-id header) is required." }, { status: 400 });
  }

  const decisionReasonCodes = Array.isArray(b.decisionReasonCodes)
    ? b.decisionReasonCodes.filter((c): c is string => typeof c === "string")
    : [];

  if (!decisionReasonCodes.length) {
    return Response.json({ error: "decisionReasonCodes must be a non-empty array." }, { status: 400 });
  }

  const decisionNotes = typeof b.decisionNotes === "string" ? b.decisionNotes : null;

  const reviewCase = applyAdminReviewDecisionInStore({
    reviewCaseId,
    decision,
    decidedByUserId,
    decisionReasonCodes,
    decisionNotes
  });

  if (!reviewCase) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    status: reviewCase.status,
    reviewCase,
    audit: {
      kind: "review_decision_applied",
      message:
        "Decision persisted in admin review store. Economic side-effects are applied only by backend workers / ledger paths — not this UI."
    },
    notification: {
      kind: "review_decision_recorded",
      message: "Explanatory notification stub (no wallet mutation from UI)."
    }
  });
}
