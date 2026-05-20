import type { VerificationGateResult } from "../../verification/studioVerificationTypes";

function gateColor(status: VerificationGateResult["status"]): string {
  if (status === "passed") return "#86efac";
  if (status === "failed" || status === "rejected") return "#fca5a5";
  if (status === "under_review" || status === "pending") return "#fcd34d";
  return "#94a3b8";
}

export function VerificationGateStack({ gates }: { gates: VerificationGateResult[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {gates.map((g) => (
        <div key={g.id} className="ist-panel" style={{ padding: 10, borderColor: "rgba(148,163,184,0.28)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ fontSize: 11 }}>{g.gateType}</strong>
            <span className="ist-mono" style={{ color: gateColor(g.status), fontSize: 10 }}>
              {g.status}
            </span>
          </div>
          <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginTop: 6 }}>
            score {g.score} / threshold {g.threshold} · {g.blocking ? "blocking" : "non-blocking"}
          </div>
          <div className="ist-mono" style={{ fontSize: 10, marginTop: 4 }}>
            {g.message}
          </div>
        </div>
      ))}
      {gates.length === 0 ? <p className="ist-mono" style={{ fontSize: 10 }}>No gate results yet.</p> : null}
    </div>
  );
}
