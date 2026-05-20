import type { StudioController } from "../../studioStore";

const steps = [
  "Action started",
  "Eligibility checked",
  "POPS if required",
  "Fraud assessment",
  "Verification gates",
  "Reward decision",
  "Ledger update",
  "Settlement hold/release",
];

export function ActionVerificationTimeline({ studio }: { studio: StudioController }) {
  const last = studio.state.verificationRecords.at(-1);
  return (
    <div className="ist-panel" style={{ padding: 10 }}>
      <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginBottom: 8 }}>
        {last ? `Latest: ${last.subjectType} · ${last.status}` : "No action verification run yet."}
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
        {steps.map((s) => (
          <li key={s} className="ist-mono" style={{ fontSize: 10 }}>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
