import { REVIEW_PRIORITY_LABELS } from "@/lib/admin-review/admin-review-ui-rules";

export function AdminReviewPriorityBadge(props: { priority?: string | null }) {
  const priority = props.priority ?? "normal";

  const tone =
    priority === "urgent"
      ? "border-red-700 bg-red-950 text-red-200"
      : priority === "high"
        ? "border-orange-700 bg-orange-950 text-orange-200"
        : priority === "normal"
          ? "border-blue-700 bg-blue-950 text-blue-200"
          : "border-neutral-700 bg-neutral-900 text-neutral-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {REVIEW_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}
