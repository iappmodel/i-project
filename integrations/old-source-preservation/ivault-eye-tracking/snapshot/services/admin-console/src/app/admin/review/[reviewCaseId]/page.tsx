import { notFound } from "next/navigation";
import { AdminReviewShell } from "@/components/admin-review/AdminReviewShell";
import { AdminReviewCaseHeader } from "@/components/admin-review/AdminReviewCaseHeader";
import { AdminReviewEvidencePanel } from "@/components/admin-review/AdminReviewEvidencePanel";
import { AdminReviewRawEvidencePanel } from "@/components/admin-review/AdminReviewRawEvidencePanel";
import { AdminReviewDecisionForm } from "@/components/admin-review/AdminReviewDecisionForm";
import { AdminReviewAssignmentCard } from "@/components/admin-review/AdminReviewAssignmentCard";
import { AdminReviewLinkedObjects } from "@/components/admin-review/AdminReviewLinkedObjects";
import { AdminReviewTimeline } from "@/components/admin-review/AdminReviewTimeline";
import { AdminReviewAuditPanel } from "@/components/admin-review/AdminReviewAuditPanel";
import { getAdminReviewCase } from "@/lib/alphabet/admin-review/admin-review-store";

export default async function AdminReviewDetailPage(props: {
  params: Promise<{ reviewCaseId: string }>;
}) {
  const { reviewCaseId } = await props.params;
  const reviewCase = getAdminReviewCase(reviewCaseId);

  if (!reviewCase) {
    notFound();
  }

  return (
    <AdminReviewShell
      title="Review Case Detail"
      description="Inspect evidence, assign ownership, and apply controlled admin decisions."
    >
      <div className="space-y-6">
        <AdminReviewCaseHeader reviewCase={reviewCase} />

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <AdminReviewEvidencePanel reviewCase={reviewCase} />
            <AdminReviewRawEvidencePanel reviewCase={reviewCase} />
            <AdminReviewLinkedObjects reviewCase={reviewCase} />
            <AdminReviewAuditPanel reviewCase={reviewCase} />
          </div>

          <aside className="space-y-6">
            <AdminReviewAssignmentCard reviewCase={reviewCase} />
            <AdminReviewDecisionForm reviewCase={reviewCase} />
            <AdminReviewTimeline reviewCase={reviewCase} />
          </aside>
        </div>
      </div>
    </AdminReviewShell>
  );
}
