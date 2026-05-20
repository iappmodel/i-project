import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { formatJson } from "@/lib/admin-review/admin-review-formatters";

export function AdminReviewAuditPanel(props: {
  reviewCase: AdminReviewCaseRow;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Audit Snapshot</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Full audit trail can be wired to audit_records later. Current snapshot shows decision metadata.
      </p>

      <pre className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-neutral-900 bg-black p-4 text-xs text-neutral-300">
        {formatJson({
          decision: props.reviewCase.decision,
          decisionReasonCodes: props.reviewCase.decision_reason_codes,
          decisionNotes: props.reviewCase.decision_notes,
          safetyScores: props.reviewCase.safety_scores,
          sourceEventIds: props.reviewCase.source_event_ids
        })}
      </pre>
    </section>
  );
}
