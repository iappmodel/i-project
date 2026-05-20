import Link from "next/link";
import type { TrustFraudReviewBatchRow } from "@/lib/trust-fraud-review/trust-fraud-review-client";
import {
  formatTrustFraudDate,
  formatTrustFraudId,
  formatTrustFraudLabel,
  formatTrustFraudPercent
} from "@/lib/trust-fraud-review/trust-fraud-review-formatters";
import { TrustFraudReviewSeverityBadge } from "./TrustFraudReviewSeverityBadge";
import { TrustFraudReviewStatusBadge } from "./TrustFraudReviewStatusBadge";

export function TrustFraudReviewTable(props: { batches: TrustFraudReviewBatchRow[] }) {
  if (!props.batches.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center">
        <h3 className="text-sm font-semibold text-neutral-200">No batches</h3>
        <p className="mt-2 text-sm text-neutral-500">No trust/fraud review batches found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-800 bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Batch</th>
            <th className="px-4 py-3">Scope</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Findings</th>
            <th className="px-4 py-3">Risk</th>
            <th className="px-4 py-3">Urgency</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {props.batches.map((batch) => (
            <tr key={batch.batch_id} className="hover:bg-neutral-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/trust-fraud-review/${batch.batch_id}`}
                  className="font-mono text-xs text-rose-300 hover:text-rose-200"
                >
                  {formatTrustFraudId(batch.batch_id)}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-300">{formatTrustFraudLabel(batch.batch_scope)}</td>
              <td className="px-4 py-3">
                <TrustFraudReviewStatusBadge status={batch.status} />
              </td>
              <td className="px-4 py-3">
                <TrustFraudReviewSeverityBadge severity={batch.severity} />
              </td>
              <td className="px-4 py-3 text-neutral-300">
                {batch.finding_count} / {batch.critical_finding_count} critical
              </td>
              <td className="px-4 py-3 text-neutral-300">{formatTrustFraudPercent(batch.batch_risk_score)}</td>
              <td className="px-4 py-3 text-neutral-300">{formatTrustFraudPercent(batch.action_urgency_score)}</td>
              <td className="px-4 py-3 text-xs text-neutral-500">{formatTrustFraudDate(batch.batch_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
