import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { formatJson } from "@/lib/admin-review/admin-review-formatters";

export function AdminReviewEvidencePanel(props: {
  reviewCase: AdminReviewCaseRow;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-100">Redacted Evidence</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Safe operational evidence. Sensitive fields are removed or masked.
        </p>
      </div>

      <pre className="max-h-[520px] overflow-auto rounded-xl border border-neutral-900 bg-black p-4 text-xs leading-relaxed text-neutral-300">
        {formatJson(props.reviewCase.redacted_evidence ?? {})}
      </pre>
    </section>
  );
}
