import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { formatCaseType, formatDateTime, formatShortId, numberToPercent } from "@/lib/admin-review/admin-review-formatters";
import { REVIEW_DECISION_LABELS } from "@/lib/admin-review/admin-review-ui-rules";
import { AdminReviewStatusBadge } from "./AdminReviewStatusBadge";
import { AdminReviewSeverityBadge } from "./AdminReviewSeverityBadge";
import { AdminReviewPriorityBadge } from "./AdminReviewPriorityBadge";

function SafetyScoresGrid(props: { scores: AdminReviewCaseRow["safety_scores"] }) {
  if (!props.scores || typeof props.scores !== "object" || Array.isArray(props.scores)) {
    return <p className="text-xs text-neutral-500">No safety scores.</p>;
  }

  const entries = Object.entries(props.scores as Record<string, number>);
  if (!entries.length) {
    return <p className="text-xs text-neutral-500">No safety scores.</p>;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-neutral-900 bg-black/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">{key.replace(/Score$/, "")}</p>
          <p className="mt-1 font-mono text-sm text-neutral-200">{numberToPercent(value)}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminReviewCaseHeader(props: {
  reviewCase: AdminReviewCaseRow;
}) {
  const reviewCase = props.reviewCase;

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500">
            Review Case / {formatShortId(reviewCase.review_case_id)}
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
            {formatCaseType(reviewCase.review_case_type)}
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            {reviewCase.public_summary ?? "No public summary provided."}
          </p>

          {reviewCase.internal_summary ? (
            <p className="mt-2 max-w-3xl text-sm text-neutral-500">
              <span className="font-medium text-neutral-400">Internal:</span> {reviewCase.internal_summary}
            </p>
          ) : null}

          {reviewCase.decision ? (
            <p className="mt-3 text-xs text-neutral-400">
              Last decision:{" "}
              <span className="font-medium text-neutral-200">
                {REVIEW_DECISION_LABELS[reviewCase.decision] ?? reviewCase.decision}
              </span>
            </p>
          ) : null}

          {reviewCase.decision_reason_codes?.length ? (
            <p className="mt-1 font-mono text-xs text-neutral-500">
              Reason codes: {reviewCase.decision_reason_codes.join(", ")}
            </p>
          ) : null}

          {reviewCase.decision_notes ? (
            <p className="mt-2 max-w-3xl text-xs text-neutral-500">Notes: {reviewCase.decision_notes}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminReviewStatusBadge status={reviewCase.status} />
          <AdminReviewSeverityBadge severity={reviewCase.severity} />
          <AdminReviewPriorityBadge priority={reviewCase.priority} />
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-900 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Safety scores</p>
        <SafetyScoresGrid scores={reviewCase.safety_scores} />
      </div>

      <div className="mt-6 grid gap-4 border-t border-neutral-900 pt-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-neutral-500">Trigger</p>
          <p className="mt-1 text-neutral-300">{reviewCase.review_trigger}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Assigned</p>
          <p className="mt-1 font-mono text-neutral-300">{formatShortId(reviewCase.assigned_reviewer_id)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Created</p>
          <p className="mt-1 text-neutral-300">{formatDateTime(reviewCase.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Due</p>
          <p className="mt-1 text-neutral-300">{formatDateTime(reviewCase.due_at)}</p>
        </div>
      </div>
    </section>
  );
}
