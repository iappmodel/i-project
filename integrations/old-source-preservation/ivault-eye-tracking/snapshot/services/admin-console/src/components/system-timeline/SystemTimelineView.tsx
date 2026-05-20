import type { SystemTimelineResult } from "@/types/alphabet/system-timeline.types";
import { SystemObjectGraphView } from "./SystemObjectGraphView";
import { SystemTimelineEmptyState } from "./SystemTimelineEmptyState";
import { SystemTimelineEntryCard } from "./SystemTimelineEntryCard";

export function SystemTimelineView(props: { timeline: SystemTimelineResult }) {
  const { timeline } = props;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
        <p className="text-xs text-neutral-500">Root</p>
        <p className="mt-1 font-mono text-sm text-neutral-200">
          {timeline.root.objectType}:{timeline.root.objectId}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs text-neutral-500">Graph Completeness</p>
          <p className="mt-2 text-2xl font-semibold">
            {Math.round(timeline.scores.graphCompletenessScore * 100)}%
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs text-neutral-500">Timeline Integrity</p>
          <p className="mt-2 text-2xl font-semibold">
            {Math.round(timeline.scores.timelineIntegrityScore * 100)}%
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs text-neutral-500">Audit Risk</p>
          <p className="mt-2 text-2xl font-semibold">
            {Math.round(timeline.scores.auditRiskScore * 100)}%
          </p>
        </div>
      </section>

      {timeline.anomalies.length ? (
        <section className="rounded-2xl border border-red-900 bg-red-950/20 p-5">
          <h2 className="text-sm font-semibold text-red-200">Anomalies</h2>
          <div className="mt-4 space-y-3">
            {timeline.anomalies.map((anomaly) => (
              <div key={anomaly.anomalyId} className="rounded-xl border border-red-900 bg-black p-4">
                <p className="text-sm font-semibold text-red-200">{anomaly.title}</p>
                <p className="mt-1 text-sm text-red-300/80">{anomaly.summary}</p>
                <p className="mt-2 font-mono text-xs text-red-400/80">
                  {anomaly.objectType}:{anomaly.objectId}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-red-400/70">Redacted evidence</summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-red-950 bg-black p-2 text-xs text-red-200/80">
                    {JSON.stringify(anomaly.redactedEvidence, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <SystemObjectGraphView nodes={timeline.nodes} edges={timeline.edges} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-100">Chronological Timeline</h2>

        {timeline.entries.length ? (
          timeline.entries.map((entry) => <SystemTimelineEntryCard key={entry.entryId} entry={entry} />)
        ) : (
          <SystemTimelineEmptyState />
        )}
      </section>
    </div>
  );
}
