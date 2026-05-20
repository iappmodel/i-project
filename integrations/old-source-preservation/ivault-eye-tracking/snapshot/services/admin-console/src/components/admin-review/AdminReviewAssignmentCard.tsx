"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { assignReviewCase } from "@/lib/admin-review/admin-review-client";
import { canAssignCase } from "@/lib/admin-review/admin-review-ui-rules";
import { formatShortId } from "@/lib/admin-review/admin-review-formatters";

export function AdminReviewAssignmentCard(props: {
  reviewCase: AdminReviewCaseRow;
  onAssigned?: () => void;
}) {
  const router = useRouter();
  const [assignedReviewerId, setAssignedReviewerId] = useState(
    props.reviewCase.assigned_reviewer_id ?? ""
  );
  const [assignedTeam, setAssignedTeam] = useState(props.reviewCase.assigned_team ?? "payments");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = !canAssignCase(props.reviewCase.status) || submitting;

  async function submit() {
    if (!assignedReviewerId) {
      setMessage("Reviewer ID is required.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await assignReviewCase({
        reviewCaseId: props.reviewCase.review_case_id,
        assignedReviewerId,
        assignedTeam
      });

      setMessage("Assigned.");
      props.onAssigned?.();
      router.refresh();
    } catch {
      setMessage("Assignment failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Assignment</h3>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-neutral-500">Assigned Reviewer ID</label>
          <input
            value={assignedReviewerId}
            onChange={(event) => setAssignedReviewerId(event.target.value)}
            placeholder="reviewer uuid"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-neutral-600"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500">Team</label>
          <input
            value={assignedTeam}
            onChange={(event) => setAssignedTeam(event.target.value)}
            placeholder="payments"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-600"
          />
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Assigning..." : "Assign Case"}
        </button>

        <div className="text-xs text-neutral-500">
          Current: {formatShortId(props.reviewCase.assigned_reviewer_id)}
        </div>

        {message ? <p className="text-xs text-neutral-400">{message}</p> : null}
      </div>
    </section>
  );
}
