import { AdminReviewShell } from "@/components/admin-review/AdminReviewShell";
import { AdminReviewTable } from "@/components/admin-review/AdminReviewTable";
import { listAdminReviewCases } from "@/lib/alphabet/admin-review/admin-review-store";

export default async function AdminReviewQueuePage() {
  const cases = listAdminReviewCases({
    status: "review_queued",
    limit: 100
  });

  return (
    <AdminReviewShell
      title="Review Queue"
      description="Cases waiting for assignment or action."
    >
      <AdminReviewTable cases={cases} />
    </AdminReviewShell>
  );
}
