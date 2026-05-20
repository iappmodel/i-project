import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { formatShortId } from "@/lib/admin-review/admin-review-formatters";

const fields: Array<[keyof AdminReviewCaseRow, string]> = [
  ["user_id", "User"],
  ["actor_user_id", "Actor"],
  ["wallet_id", "Wallet"],
  ["content_id", "Content"],
  ["campaign_id", "Campaign"],
  ["grant_eligibility_id", "Grant Eligibility"],
  ["external_transfer_id", "External Transfer"],
  ["compensation_id", "Compensation"],
  ["policy_decision_id", "Policy Decision"],
  ["pipeline_id", "Pipeline"],
  ["saga_id", "Saga"],
  ["execution_request_id", "Execution Request"],
  ["provider_reconciliation_id", "Provider Reconciliation"]
];

export function AdminReviewLinkedObjects(props: {
  reviewCase: AdminReviewCaseRow;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Linked Objects</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Object graph for downstream review context. (Graph layout placeholder — wire to relations later.)
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map(([key, label]) => {
          const value = props.reviewCase[key] as string | null | undefined;

          return (
            <div
              key={String(key)}
              className="rounded-xl border border-neutral-900 bg-black px-3 py-3"
            >
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="mt-1 font-mono text-xs text-neutral-300">
                {formatShortId(value)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 p-4 text-center text-xs text-neutral-500">
        Linked object graph visualization placeholder (nodes/edges TBD).
      </div>
    </section>
  );
}
