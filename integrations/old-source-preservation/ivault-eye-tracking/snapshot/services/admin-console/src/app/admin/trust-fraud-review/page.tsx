import { TrustFraudReviewShell } from "@/components/trust-fraud-review/TrustFraudReviewShell";
import { TrustFraudReviewTable } from "@/components/trust-fraud-review/TrustFraudReviewTable";
import { listTrustFraudReviewBatches } from "@/lib/alphabet/trust-fraud-review/trust-fraud-review-store";

export default function TrustFraudReviewPage() {
  const batches = listTrustFraudReviewBatches({ limit: 100 });

  return (
    <TrustFraudReviewShell
      title="Daily Trust/Fraud Review"
      description="Risk findings, reward abuse signals, wallet/payout risk, identity clusters, policy conflicts, and recommended actions."
    >
      <TrustFraudReviewTable batches={batches} />
    </TrustFraudReviewShell>
  );
}
