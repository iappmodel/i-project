import { AdminReviewShell } from "@/components/admin-review/AdminReviewShell";
import { AdminReviewTable } from "@/components/admin-review/AdminReviewTable";
import { listAdminReviewCases } from "@/lib/alphabet/admin-review/admin-review-store";

export default async function AdminReviewEscalationsPage() {
  const escalated = listAdminReviewCases({
    escalationsOnly: true,
    limit: 100
  });

  return (
    <AdminReviewShell
      title="Escalations"
      description="Escalated status or critical severity — elevated authority queue."
    >
      <AdminReviewTable cases={escalated} />
    </AdminReviewShell>
  );
}
