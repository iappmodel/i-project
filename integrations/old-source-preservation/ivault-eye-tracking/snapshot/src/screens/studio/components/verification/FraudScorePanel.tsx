import type { StudioController } from "../../studioStore";

export function FraudScorePanel({ studio }: { studio: StudioController }) {
  const latest = studio.state.fraudAssessments.at(-1);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="ist-btn ist-btn--primary" onClick={() => studio.actions.completeCampaignActionMock()}>
          Run assessment
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.openRiskMonitor()}>
          Require POPS / Hold
        </button>
      </div>
      {latest ? (
        <div className="ist-panel" style={{ padding: 10 }}>
          <div className="ist-mono" style={{ fontSize: 10 }}>
            Risk score {latest.riskScore} · level {latest.riskLevel} · action {latest.recommendedAction}
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {latest.signals.map((s) => (
              <div key={s.id} className="ist-mono" style={{ fontSize: 10 }}>
                {s.type} · {s.severity} · +{s.scoreImpact} — {s.message}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="ist-mono" style={{ fontSize: 10 }}>No fraud assessment yet.</p>
      )}
    </div>
  );
}
