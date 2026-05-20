import type { TrustFraudReviewBatchRow } from "@/lib/trust-fraud-review/trust-fraud-review-client";
import { formatTrustFraudPercent } from "@/lib/trust-fraud-review/trust-fraud-review-formatters";

export function TrustFraudReviewSummaryCards(props: { batch: TrustFraudReviewBatchRow }) {
  const cards = [
    ["Total Findings", props.batch.finding_count],
    ["Critical Findings", props.batch.critical_finding_count],
    ["Fraud Findings", props.batch.fraud_finding_count],
    ["Wallet/Payout Findings", props.batch.wallet_finding_count + props.batch.payout_finding_count],
    ["Batch Risk", formatTrustFraudPercent(props.batch.batch_risk_score)],
    ["Action Urgency", formatTrustFraudPercent(props.batch.action_urgency_score)]
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={String(label)} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs text-neutral-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-100">{value}</p>
        </div>
      ))}
    </section>
  );
}
