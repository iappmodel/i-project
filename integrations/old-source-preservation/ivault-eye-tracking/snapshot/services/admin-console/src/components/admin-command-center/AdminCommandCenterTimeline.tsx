import { formatCommandDateTime, formatCommandLabel } from "@/lib/admin-command-center/admin-command-center-formatters";

export function AdminCommandCenterTimeline(props: {
  timeline: {
    decisions?: Array<Record<string, unknown>>;
    notes?: Array<Record<string, unknown>>;
  };
}) {
  const decisions = props.timeline.decisions ?? [];
  const notes = props.timeline.notes ?? [];

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Timeline</h3>

      <div className="mt-4 space-y-3">
        {decisions.map((decision) => (
          <div
            key={String(decision.command_decision_id)}
            className="rounded-xl border border-neutral-900 bg-black p-4"
          >
            <p className="text-sm font-semibold text-neutral-200">
              {formatCommandLabel(String(decision.decision_type ?? ""))}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {formatCommandDateTime(decision.created_at as string | undefined)} ·{" "}
              {String(decision.actor_role ?? "")}
            </p>
            <p className="mt-2 text-sm text-neutral-400">{String(decision.evidence_summary ?? "")}</p>
          </div>
        ))}

        {notes.map((note) => (
          <div
            key={String(note.command_note_id)}
            className="rounded-xl border border-neutral-900 bg-black p-4"
          >
            <p className="text-sm font-semibold text-neutral-200">Admin note</p>
            <p className="mt-1 text-xs text-neutral-500">
              {formatCommandDateTime(note.created_at as string | undefined)} · {String(note.actor_role ?? "")}
            </p>
            <p className="mt-2 text-sm text-neutral-400">{String(note.note_body ?? "")}</p>
          </div>
        ))}

        {!decisions.length && !notes.length ? (
          <p className="text-sm text-neutral-500">No timeline entries yet.</p>
        ) : null}
      </div>
    </section>
  );
}
