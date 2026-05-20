import type { RiskInboxAlertRow } from "@/lib/risk-inbox/risk-inbox-client";

export function RiskAlertEvidencePanel(props: { alert: RiskInboxAlertRow }) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Redacted evidence</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Raw evidence is not shown here. Alerts are detection and routing only.
      </p>
      <pre className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-neutral-900 bg-black p-4 text-xs text-neutral-300">
        {JSON.stringify(props.alert.redacted_evidence ?? {}, null, 2)}
      </pre>
    </section>
  );
}
