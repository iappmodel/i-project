import type { TrustFraudReviewBatchRow } from "@/lib/trust-fraud-review/trust-fraud-review-client";
import {
  formatTrustFraudDate,
  formatTrustFraudDateTime,
  formatTrustFraudId,
  formatTrustFraudLabel,
  formatTrustFraudPercent
} from "@/lib/trust-fraud-review/trust-fraud-review-formatters";
import { TrustFraudReviewFindingPanel } from "./TrustFraudReviewFindingPanel";
import { TrustFraudReviewSeverityBadge } from "./TrustFraudReviewSeverityBadge";
import { TrustFraudReviewStatusBadge } from "./TrustFraudReviewStatusBadge";
import { TrustFraudReviewSummaryCards } from "./TrustFraudReviewSummaryCards";

export function TrustFraudReviewDetail(props: { batch: TrustFraudReviewBatchRow }) {
  const batch = props.batch;
  const counts = [
    ["Users", batch.user_count],
    ["Wallets", batch.wallet_count],
    ["Wallet Accounts", batch.wallet_account_count],
    ["Ledger Entries", batch.ledger_entry_count],
    ["Alphabet Events", batch.alphabet_event_count],
    ["Trust Events", batch.trust_event_count],
    ["U Value Events", batch.u_value_event_count],
    ["Reward Events", batch.reward_event_count],
    ["Payouts", batch.payout_count],
    ["Campaigns", batch.campaign_count],
    ["Device Signals", batch.device_signal_count],
    ["Presence Signals", batch.presence_signal_count],
    ["Policy Decisions", batch.policy_decision_count],
    ["Review Cases", batch.admin_review_case_count],
    ["Operational Alerts", batch.operational_alert_count]
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500">
              Batch / {formatTrustFraudId(batch.batch_id)}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{formatTrustFraudLabel(batch.batch_scope)}</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Batch date: {formatTrustFraudDate(batch.batch_date)} · Period: {formatTrustFraudDateTime(batch.period_start)} →{" "}
              {formatTrustFraudDateTime(batch.period_end)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TrustFraudReviewStatusBadge status={batch.status} />
            <TrustFraudReviewSeverityBadge severity={batch.severity} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-neutral-900 pt-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-neutral-500">Batch Risk</p>
            <p className="mt-1 text-neutral-300">{formatTrustFraudPercent(batch.batch_risk_score)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Confidence</p>
            <p className="mt-1 text-neutral-300">{formatTrustFraudPercent(batch.batch_confidence_score)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Urgency</p>
            <p className="mt-1 text-neutral-300">{formatTrustFraudPercent(batch.action_urgency_score)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Critical Findings</p>
            <p className="mt-1 text-neutral-300">{batch.critical_finding_count}</p>
          </div>
        </div>
      </section>

      <TrustFraudReviewSummaryCards batch={batch} />
      <TrustFraudReviewFindingPanel findings={batch.findings} />

      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <h3 className="text-sm font-semibold text-neutral-100">Source Record Counts</h3>
        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-900">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-neutral-900">
              {counts.map(([label, value]) => (
                <tr key={String(label)}>
                  <td className="px-4 py-3 text-neutral-500">{label}</td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-200">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <h3 className="text-sm font-semibold text-neutral-100">Raw Breakdown</h3>
        <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-neutral-900 bg-black p-4 text-xs text-neutral-300">
          {JSON.stringify(batch.breakdown ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  );
}
