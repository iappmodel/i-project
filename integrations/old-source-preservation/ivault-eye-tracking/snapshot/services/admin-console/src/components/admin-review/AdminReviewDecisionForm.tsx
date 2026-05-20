"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { decideReviewCase } from "@/lib/admin-review/admin-review-client";
import {
  REVIEW_DECISION_LABELS,
  REVIEW_DECISION_OPTIONS,
  canDecideCase
} from "@/lib/admin-review/admin-review-ui-rules";

export function AdminReviewDecisionForm(props: {
  reviewCase: AdminReviewCaseRow;
  onDecided?: () => void;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<string>("approve_continue");
  const [decidedByUserId, setDecidedByUserId] = useState("");
  const [reasonCodes, setReasonCodes] = useState("manual_review_completed");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = !canDecideCase(props.reviewCase.status) || submitting;

  async function submit() {
    if (!decidedByUserId) {
      setMessage("Decider user ID is required.");
      return;
    }

    const parsedReasonCodes = reasonCodes
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);

    if (!parsedReasonCodes.length) {
      setMessage("At least one reason code is required.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const result = await decideReviewCase({
        reviewCaseId: props.reviewCase.review_case_id,
        decision,
        decidedByUserId,
        decisionReasonCodes: parsedReasonCodes,
        decisionNotes
      });

      setMessage(`Decision applied (status: ${result.status}).`);
      props.onDecided?.();
      router.refresh();
    } catch {
      setMessage("Decision failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Decision</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Decision is applied by backend. This form does not mutate money directly.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs text-neutral-500">Decision</label>
          <select
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-600"
          >
            {REVIEW_DECISION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {REVIEW_DECISION_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-neutral-500">Decided By User ID</label>
          <input
            value={decidedByUserId}
            onChange={(event) => setDecidedByUserId(event.target.value)}
            placeholder="admin uuid"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-neutral-600"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500">Reason Codes</label>
          <input
            value={reasonCodes}
            onChange={(event) => setReasonCodes(event.target.value)}
            placeholder="comma,separated,codes"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-neutral-600"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500">Decision Notes</label>
          <textarea
            value={decisionNotes}
            onChange={(event) => setDecisionNotes(event.target.value)}
            rows={5}
            placeholder="Internal notes. Not user-visible by default."
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-600"
          />
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Applying..." : "Apply Decision"}
        </button>

        {message ? <p className="text-xs text-neutral-400">{message}</p> : null}
      </div>
    </section>
  );
}
