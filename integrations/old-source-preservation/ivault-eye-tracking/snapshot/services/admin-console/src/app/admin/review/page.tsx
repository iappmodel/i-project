import { AdminReviewShell } from "@/components/admin-review/AdminReviewShell";
import { AdminReviewTable } from "@/components/admin-review/AdminReviewTable";
import { listAdminReviewCases } from "@/lib/alphabet/admin-review/admin-review-store";

export default async function AdminReviewPage() {
  const cases = listAdminReviewCases({
    limit: 100
  });

  return (
    <AdminReviewShell
      title="Review Cases"
      description="All admin review cases across policy, payouts, compensation, fraud, wallets, campaigns, and provider reconciliation."
    >
      <AdminReviewTable cases={cases} />
    </AdminReviewShell>
  );
}
