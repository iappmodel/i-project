import type { SystemTimelineEntry } from "@/types/alphabet/system-timeline.types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(value));
}

function severityClass(severity: string) {
  if (severity === "critical") return "border-red-700 bg-red-950/30";
  if (severity === "danger") return "border-red-900 bg-red-950/10";
  if (severity === "warning") return "border-yellow-900 bg-yellow-950/10";
  if (severity === "success") return "border-emerald-900 bg-emerald-950/10";
  return "border-neutral-800 bg-neutral-950";
}

export function SystemTimelineEntryCard(props: { entry: SystemTimelineEntry }) {
  return (
    <article className={`rounded-2xl border p-4 ${severityClass(props.entry.severity)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-300">
              {props.entry.entryType}
            </span>
            <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-400">
              {props.entry.severity}
            </span>
            {props.entry.status ? (
              <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-400">
                {props.entry.status}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-sm font-semibold text-neutral-100">{props.entry.title}</h3>

          {props.entry.summary ? (
            <p className="mt-1 text-sm text-neutral-400">{props.entry.summary}</p>
          ) : null}

          <p className="mt-2 font-mono text-xs text-neutral-500">
            {props.entry.objectType}:{props.entry.objectId}
          </p>
        </div>

        <time className="shrink-0 text-xs text-neutral-500">{formatDate(props.entry.occurredAt)}</time>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-neutral-500">Redacted payload</summary>
        <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-neutral-900 bg-black p-3 text-xs text-neutral-300">
          {JSON.stringify(props.entry.redactedPayload, null, 2)}
        </pre>
      </details>
    </article>
  );
}
