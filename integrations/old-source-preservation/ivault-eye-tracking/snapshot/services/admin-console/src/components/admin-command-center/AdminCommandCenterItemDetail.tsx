import type { AdminCommandItemRow } from "@/lib/admin-command-center/admin-command-center-client";
import {
  formatCommandDateTime,
  formatCommandId,
  formatCommandLabel
} from "@/lib/admin-command-center/admin-command-center-formatters";
import { AdminCommandCenterStatusBadge } from "./AdminCommandCenterStatusBadge";
import { AdminCommandCenterSeverityBadge } from "./AdminCommandCenterSeverityBadge";
import { AdminCommandCenterEvidencePanel } from "./AdminCommandCenterEvidencePanel";
import { AdminCommandCenterActionPanel } from "./AdminCommandCenterActionPanel";
import { AdminCommandCenterDecisionPanel } from "./AdminCommandCenterDecisionPanel";
import { AdminCommandCenterTimeline } from "./AdminCommandCenterTimeline";
import { AdminCommandCenterNoteForm } from "./AdminCommandCenterNoteForm";

export function AdminCommandCenterItemDetail(props: {
  item: AdminCommandItemRow;
  timeline: {
    decisions?: Array<Record<string, unknown>>;
    notes?: Array<Record<string, unknown>>;
  };
}) {
  const item = props.item;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500">
              Command Item / {formatCommandId(item.command_item_id)}
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{item.title}</h2>

            <p className="mt-2 max-w-4xl text-sm text-neutral-400">{item.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminCommandCenterStatusBadge status={item.status} />
            <AdminCommandCenterSeverityBadge severity={item.severity} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-neutral-900 pt-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-neutral-500">Type</p>
            <p className="mt-1 text-neutral-300">{formatCommandLabel(item.item_type)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Scope</p>
            <p className="mt-1 text-neutral-300">{formatCommandLabel(item.queue_scope)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Priority</p>
            <p className="mt-1 text-neutral-300">{formatCommandLabel(item.priority)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Created</p>
            <p className="mt-1 text-neutral-300">{formatCommandDateTime(item.created_at)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <AdminCommandCenterEvidencePanel evidence={item.evidence} redactedEvidence={item.redacted_evidence} />
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <h3 className="text-sm font-semibold text-neutral-100">Source & links</h3>
            <div className="mt-3 space-y-2 text-xs text-neutral-400">
              <p>
                <span className="text-neutral-500">Source:</span> {item.source_object_type ?? "—"} /{" "}
                {item.source_object_id ?? "—"}
              </p>
              <p>
                <span className="text-neutral-500">Source event IDs:</span>{" "}
                {(item.source_event_ids ?? []).length ? (item.source_event_ids ?? []).join(", ") : "—"}
              </p>
              <p>
                <span className="text-neutral-500">Linked alerts:</span>{" "}
                {(item.linked_alert_ids ?? []).length ? (item.linked_alert_ids ?? []).join(", ") : "—"}
              </p>
              <p>
                <span className="text-neutral-500">Linked review cases:</span>{" "}
                {(item.linked_review_case_ids ?? []).length ? (item.linked_review_case_ids ?? []).join(", ") : "—"}
              </p>
            </div>
          </section>
          <AdminCommandCenterTimeline timeline={props.timeline} />
          <AdminCommandCenterNoteForm commandItemId={item.command_item_id} />
        </div>

        <div className="space-y-6">
          <AdminCommandCenterActionPanel item={item} />
          <AdminCommandCenterDecisionPanel item={item} />
        </div>
      </div>
    </div>
  );
}
