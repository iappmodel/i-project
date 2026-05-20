export function TrustFraudReviewFindingPanel(props: { findings: unknown }) {
  const findings = Array.isArray(props.findings) ? props.findings : [];

  if (!findings.length) {
    return (
      <section className="rounded-2xl border border-emerald-900 bg-emerald-950/10 p-5">
        <h3 className="text-sm font-semibold text-emerald-200">No findings</h3>
        <p className="mt-1 text-sm text-emerald-300/80">This batch did not detect trust/fraud findings.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-red-900 bg-red-950/20 p-5">
      <h3 className="text-sm font-semibold text-red-200">Findings</h3>
      <div className="mt-4 space-y-3">
        {findings.map((item: any) => (
          <div key={item.findingId} className="rounded-xl border border-red-900 bg-black p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-200">{item.title}</p>
                <p className="mt-1 text-sm text-red-300/80">{item.summary}</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full border border-red-800 px-2 py-1 text-xs text-red-200">
                  {item.severity}
                </span>
                <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-300">
                  {item.category}
                </span>
              </div>
            </div>
            <p className="mt-2 font-mono text-xs text-red-300/70">{item.findingType}</p>
            {Array.isArray(item.recommendedActions) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.recommendedActions.map((action: string) => (
                  <span key={action} className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-300">
                    {action}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
