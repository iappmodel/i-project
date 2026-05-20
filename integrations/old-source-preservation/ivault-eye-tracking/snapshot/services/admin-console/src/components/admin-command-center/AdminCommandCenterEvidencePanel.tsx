export function AdminCommandCenterEvidencePanel(props: {
  evidence: unknown;
  redactedEvidence: unknown;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <h3 className="text-sm font-semibold text-neutral-100">Redacted Evidence</h3>
        <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-neutral-900 bg-black p-4 text-xs text-neutral-300">
          {JSON.stringify(props.redactedEvidence ?? {}, null, 2)}
        </pre>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <h3 className="text-sm font-semibold text-neutral-100">Full Evidence</h3>
        <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-neutral-900 bg-black p-4 text-xs text-neutral-300">
          {JSON.stringify(props.evidence ?? {}, null, 2)}
        </pre>
      </div>
    </section>
  );
}
