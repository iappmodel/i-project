export function TrustFraudReviewStatusBadge(props: { status?: string | null }) {
  const status = props.status ?? "unknown";
  const tone =
    status === "trust_fraud_batch_completed"
      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
      : status === "trust_fraud_batch_completed_with_warnings"
        ? "border-yellow-800 bg-yellow-950 text-yellow-300"
        : status === "trust_fraud_batch_requires_review"
          ? "border-red-700 bg-red-950 text-red-200"
          : status === "trust_fraud_batch_failed"
            ? "border-red-900 bg-red-950 text-red-300"
            : "border-neutral-700 bg-neutral-900 text-neutral-300";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{status}</span>;
}
