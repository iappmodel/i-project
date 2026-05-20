import { AdminReviewShell } from "@/components/admin-review/AdminReviewShell";
import { AdminReviewTable } from "@/components/admin-review/AdminReviewTable";
import { listAdminReviewCases } from "@/lib/alphabet/admin-review/admin-review-store";

export default async function AdminReviewAssignedPage() {
  const cases = listAdminReviewCases({
    status: "review_assigned",
    limit: 100
  });

  return (
    <AdminReviewShell
      title="Assigned Reviews"
      description="Cases assigned to reviewers."
    >
      <AdminReviewTable cases={cases} />
    </AdminReviewShell>
  );
}
