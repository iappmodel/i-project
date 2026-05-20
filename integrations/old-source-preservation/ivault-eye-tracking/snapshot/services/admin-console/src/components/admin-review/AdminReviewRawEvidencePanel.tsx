"use client";

import { useState } from "react";
import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { formatJson } from "@/lib/admin-review/admin-review-formatters";

export function AdminReviewRawEvidencePanel(props: {
  reviewCase: AdminReviewCaseRow;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-red-950 bg-red-950/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-red-200">Raw Evidence</h3>
          <p className="mt-1 text-xs text-red-300/80">
            Sensitive internal evidence. Do not expose this to users. Do not copy into public notes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-red-800 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-950"
        >
          {open ? "Hide Raw Evidence" : "Open Raw Evidence"}
        </button>
      </div>

      {open ? (
        <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-red-950 bg-black p-4 text-xs leading-relaxed text-red-100">
          {formatJson(props.reviewCase.raw_evidence ?? {})}
        </pre>
      ) : null}
    </section>
  );
}
