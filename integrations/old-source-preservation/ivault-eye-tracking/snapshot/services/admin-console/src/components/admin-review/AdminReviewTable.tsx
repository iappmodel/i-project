import Link from "next/link";
import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { formatCaseType, formatDateTime, formatShortId } from "@/lib/admin-review/admin-review-formatters";
import { AdminReviewStatusBadge } from "./AdminReviewStatusBadge";
import { AdminReviewSeverityBadge } from "./AdminReviewSeverityBadge";
import { AdminReviewPriorityBadge } from "./AdminReviewPriorityBadge";
import { AdminReviewEmptyState } from "./AdminReviewEmptyState";

export function AdminReviewTable(props: {
  cases: AdminReviewCaseRow[];
}) {
  if (!props.cases.length) {
    return <AdminReviewEmptyState title="No review cases" body="Nothing is currently waiting in this view." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-800 bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Case</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">Assigned</th>
            <th className="px-4 py-3">Created</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-900">
          {props.cases.map((reviewCase) => (
            <tr key={reviewCase.review_case_id} className="hover:bg-neutral-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/review/${reviewCase.review_case_id}`}
                  className="font-mono text-xs text-blue-300 hover:text-blue-200"
                >
                  {formatShortId(reviewCase.review_case_id)}
                </Link>
                <p className="mt-1 max-w-xs truncate text-xs text-neutral-500">
                  {reviewCase.review_trigger}
                </p>
              </td>

              <td className="px-4 py-3 text-neutral-300">
                {formatCaseType(reviewCase.review_case_type)}
              </td>

              <td className="px-4 py-3">
                <AdminReviewStatusBadge status={reviewCase.status} />
              </td>

              <td className="px-4 py-3">
                <AdminReviewSeverityBadge severity={reviewCase.severity} />
              </td>

              <td className="px-4 py-3">
                <AdminReviewPriorityBadge priority={reviewCase.priority} />
              </td>

              <td className="px-4 py-3">
                <div className="font-mono text-xs text-neutral-400">
                  {formatShortId(
                    reviewCase.user_id ??
                      reviewCase.wallet_id ??
                      reviewCase.external_transfer_id ??
                      reviewCase.compensation_id ??
                      reviewCase.pipeline_id
                  )}
                </div>
              </td>

              <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                {formatShortId(reviewCase.assigned_reviewer_id)}
              </td>

              <td className="px-4 py-3 text-xs text-neutral-500">
                {formatDateTime(reviewCase.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
