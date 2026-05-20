import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { formatDateTime } from "@/lib/admin-review/admin-review-formatters";

export function AdminReviewTimeline(props: {
  reviewCase: AdminReviewCaseRow;
}) {
  const items = [
    ["Created", props.reviewCase.created_at],
    ["Assigned", props.reviewCase.assigned_at],
    ["Decided", props.reviewCase.decided_at],
    ["Updated", props.reviewCase.updated_at]
  ];

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Timeline</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Milestone placeholder — extend with audit_records / event bus stream.
      </p>

      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-neutral-900 pb-3 text-sm"
          >
            <span className="text-neutral-400">{label}</span>
            <span className="text-xs text-neutral-500">{formatDateTime(value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
