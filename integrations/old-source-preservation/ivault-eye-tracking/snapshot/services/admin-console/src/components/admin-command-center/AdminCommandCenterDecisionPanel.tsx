"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  adminCommandCenterHeaders,
  linkedObjectIdsFromItemRow,
  type AdminCommandItemRow
} from "@/lib/admin-command-center/admin-command-center-client";

async function postDecision(itemId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/command-center/items/${itemId}/decision`, {
    method: "POST",
    headers: adminCommandCenterHeaders(),
    body: JSON.stringify(body)
  });
  const json = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok) throw new Error(json.message ?? "Request failed.");
  return json;
}

async function postAssign(itemId: string, assignToAdminId?: string) {
  const res = await fetch(`/api/admin/command-center/items/${itemId}/assign`, {
    method: "POST",
    headers: adminCommandCenterHeaders(),
    body: JSON.stringify(assignToAdminId ? { assignToAdminId } : {})
  });
  const json = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok) throw new Error(json.message ?? "Assign failed.");
  return json;
}

export function AdminCommandCenterDecisionPanel(props: { item: AdminCommandItemRow }) {
  const router = useRouter();
  const item = props.item;
  const linked = linkedObjectIdsFromItemRow(item);
  const [reason, setReason] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [selectedAction, setSelectedAction] = useState(item.recommended_actions?.[0] ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const idKey = (suffix: string) => `${suffix}:${item.command_item_id}:${Date.now()}`;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Decision Controls</h3>

      <div className="mt-3 space-y-2">
        <label className="block text-xs text-neutral-500">Reason codes (comma-separated)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
          placeholder="e.g. triage_complete, policy_review"
        />
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-xs text-neutral-500">Evidence summary</label>
        <textarea
          value={evidenceSummary}
          onChange={(e) => setEvidenceSummary(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
          placeholder="What you verified or decided…"
        />
      </div>

      {item.recommended_actions?.length ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-neutral-500">Recommended action for approve/reject</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
          >
            {item.recommended_actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() =>
            void run("assign", () =>
              postAssign(item.command_item_id).then(() => undefined)
            )
          }
          className="w-full rounded-xl border border-neutral-800 px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-40"
        >
          {busy === "assign" ? "…" : "Assign to me"}
        </button>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            const codes = reason.split(",").map((s) => s.trim()).filter(Boolean);
            const summary = evidenceSummary.trim() || "Additional evidence requested.";
            if (!codes.length) {
              setError("Reason codes required for request evidence.");
              return;
            }
            void run("evidence", () =>
              postDecision(item.command_item_id, {
                executableAction: "request_evidence",
                decisionType: "evidence_requested",
                decisionStatus: "decision_recorded",
                reasonCodes: codes,
                evidenceSummary: summary,
                linkedObjectIds: linked,
                beforeState: {},
                afterState: {},
                idempotencyKey: idKey("evidence"),
                dedupeKey: idKey("evidence-dedupe")
              }).then(() => undefined)
            );
          }}
          className="rounded-xl border border-neutral-800 px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-40"
        >
          {busy === "evidence" ? "…" : "Request evidence"}
        </button>

        <button
          type="button"
          disabled={!!busy || !selectedAction}
          onClick={() => {
            const codes = reason.split(",").map((s) => s.trim()).filter(Boolean);
            const summary =
              evidenceSummary.trim() ||
              `Approved recommended action ${selectedAction} as review-only (no direct mutation).`;
            if (!codes.length) {
              setError("Reason codes required.");
              return;
            }
            void run("approve", () =>
              postDecision(item.command_item_id, {
                executableAction: "approve_recommended_action",
                decisionType: "recommended_action_approved",
                decisionStatus: "decision_recorded",
                approvedAction: selectedAction,
                requestedAction: selectedAction,
                reasonCodes: codes,
                evidenceSummary: summary,
                linkedObjectIds: linked,
                beforeState: {},
                afterState: {},
                idempotencyKey: idKey("approve"),
                dedupeKey: idKey("approve-dedupe")
              }).then(() => undefined)
            );
          }}
          className="rounded-xl border border-violet-800 bg-violet-950/30 px-4 py-3 text-sm text-violet-200 hover:bg-violet-900/40 disabled:opacity-40"
        >
          {busy === "approve" ? "…" : "Approve recommended (review-only)"}
        </button>

        <button
          type="button"
          disabled={!!busy || !selectedAction}
          onClick={() => {
            const codes = reason.split(",").map((s) => s.trim()).filter(Boolean);
            const summary = evidenceSummary.trim() || `Rejected recommended action ${selectedAction}.`;
            if (!codes.length) {
              setError("Reason codes required.");
              return;
            }
            void run("reject", () =>
              postDecision(item.command_item_id, {
                executableAction: "reject_recommended_action",
                decisionType: "recommended_action_rejected",
                decisionStatus: "decision_recorded",
                rejectedAction: selectedAction,
                reasonCodes: codes,
                evidenceSummary: summary,
                linkedObjectIds: linked,
                beforeState: {},
                afterState: {},
                idempotencyKey: idKey("reject"),
                dedupeKey: idKey("reject-dedupe")
              }).then(() => undefined)
            );
          }}
          className="rounded-xl border border-neutral-800 px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-40"
        >
          {busy === "reject" ? "…" : "Reject recommended"}
        </button>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            const codes = reason.split(",").map((s) => s.trim()).filter(Boolean);
            const summary = evidenceSummary.trim() || "Escalated for senior review.";
            if (!codes.length) {
              setError("Reason codes required.");
              return;
            }
            void run("escalate", () =>
              postDecision(item.command_item_id, {
                executableAction: "escalate_item",
                decisionType: "item_escalated",
                decisionStatus: "decision_recorded",
                reasonCodes: codes,
                evidenceSummary: summary,
                linkedObjectIds: linked,
                beforeState: {},
                afterState: {},
                idempotencyKey: idKey("escalate"),
                dedupeKey: idKey("escalate-dedupe")
              }).then(() => undefined)
            );
          }}
          className="rounded-xl border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-200 hover:bg-red-900/30 disabled:opacity-40"
        >
          {busy === "escalate" ? "…" : "Escalate"}
        </button>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            const codes = reason.split(",").map((s) => s.trim()).filter(Boolean);
            const summary = evidenceSummary.trim() || "Marked resolved after review.";
            if (!codes.length) {
              setError("Reason codes required.");
              return;
            }
            void run("resolve", () =>
              postDecision(item.command_item_id, {
                executableAction: "mark_resolved",
                decisionType: "item_resolved",
                decisionStatus: "decision_recorded",
                reasonCodes: codes,
                evidenceSummary: summary,
                linkedObjectIds: linked,
                beforeState: {},
                afterState: {},
                idempotencyKey: idKey("resolve"),
                dedupeKey: idKey("resolve-dedupe")
              }).then(() => undefined)
            );
          }}
          className="rounded-xl border border-emerald-900 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200 hover:bg-emerald-900/30 disabled:opacity-40"
        >
          {busy === "resolve" ? "…" : "Mark resolved"}
        </button>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            const codes = reason.split(",").map((s) => s.trim()).filter(Boolean);
            const summary = evidenceSummary.trim() || "Dismissed after review.";
            if (!codes.length) {
              setError("Reason codes required.");
              return;
            }
            void run("dismiss", () =>
              postDecision(item.command_item_id, {
                executableAction: "dismiss_item",
                decisionType: "item_dismissed",
                decisionStatus: "decision_recorded",
                reasonCodes: codes,
                evidenceSummary: summary,
                linkedObjectIds: linked,
                beforeState: {},
                afterState: {},
                idempotencyKey: idKey("dismiss"),
                dedupeKey: idKey("dismiss-dedupe")
              }).then(() => undefined)
            );
          }}
          className="rounded-xl border border-neutral-800 px-4 py-3 text-sm text-neutral-400 hover:bg-neutral-900 disabled:opacity-40"
        >
          {busy === "dismiss" ? "…" : "Dismiss"}
        </button>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            const codes = reason.split(",").map((s) => s.trim()).filter(Boolean);
            const summary =
              evidenceSummary.trim() || "Follow-up admin review case requested from command item.";
            if (!codes.length) {
              setError("Reason codes required.");
              return;
            }
            void run("followup", () =>
              postDecision(item.command_item_id, {
                executableAction: "create_followup_review_case",
                decisionType: "followup_review_created",
                decisionStatus: "decision_recorded",
                reasonCodes: codes,
                evidenceSummary: summary,
                linkedObjectIds: linked,
                beforeState: {},
                afterState: {},
                idempotencyKey: idKey("followup"),
                dedupeKey: idKey("followup-dedupe")
              }).then(() => undefined)
            );
          }}
          className="md:col-span-2 rounded-xl border border-violet-900 px-4 py-3 text-sm text-violet-100 hover:bg-violet-950/30 disabled:opacity-40"
        >
          {busy === "followup" ? "…" : "Create follow-up review case"}
        </button>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        All actions POST to `/api/admin/command-center/items/...` with `x-role` and `x-user-id` headers. Money and
        wallet mutations are never executed here—only decision records and downstream review/repair workflows.
      </p>
    </section>
  );
}
