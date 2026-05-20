import { notFound } from "next/navigation";
import { TrustFraudReviewDetail } from "@/components/trust-fraud-review/TrustFraudReviewDetail";
import { TrustFraudReviewShell } from "@/components/trust-fraud-review/TrustFraudReviewShell";
import { getTrustFraudReviewBatch } from "@/lib/alphabet/trust-fraud-review/trust-fraud-review-store";

export default async function TrustFraudReviewDetailPage(props: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await props.params;
  const batch = getTrustFraudReviewBatch(batchId);
  if (!batch) notFound();

  return (
    <TrustFraudReviewShell
      title="Trust/Fraud Review Detail"
      description="Daily trust, fraud, payout, wallet, campaign, identity, device, reward, and presence risk review."
    >
      <TrustFraudReviewDetail batch={batch} />
    </TrustFraudReviewShell>
  );
}
