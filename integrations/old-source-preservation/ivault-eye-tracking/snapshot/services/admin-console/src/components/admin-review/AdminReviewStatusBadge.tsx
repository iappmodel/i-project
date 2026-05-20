import { REVIEW_STATUS_LABELS } from "@/lib/admin-review/admin-review-ui-rules";

export function AdminReviewStatusBadge(props: { status?: string | null }) {
  const status = props.status ?? "unknown";

  const tone =
    status === "review_approved" || status === "review_closed"
      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
      : status === "review_rejected" || status === "review_canceled"
        ? "border-red-800 bg-red-950 text-red-300"
        : status === "review_escalated"
          ? "border-orange-800 bg-orange-950 text-orange-300"
          : status === "review_needs_more_info"
            ? "border-yellow-800 bg-yellow-950 text-yellow-300"
            : "border-neutral-700 bg-neutral-900 text-neutral-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {REVIEW_STATUS_LABELS[status] ?? status}
    </span>
  );
}
