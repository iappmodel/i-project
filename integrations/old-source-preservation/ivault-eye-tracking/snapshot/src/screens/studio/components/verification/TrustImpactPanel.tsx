import type { StudioController } from "../../studioStore";

export function TrustImpactPanel({ studio }: { studio: StudioController }) {
  const viewer = studio.state.walletAccounts.find((a) => a.type === "viewer");
  const creator = studio.state.walletAccounts.find((a) => a.type === "creator");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="ist-grid2">
        <div className="ist-panel" style={{ padding: 10 }}>
          <div className="ist-mono" style={{ fontSize: 10 }}>Viewer trust</div>
          <strong>{viewer?.trustScore ?? "—"}</strong>
        </div>
        <div className="ist-panel" style={{ padding: 10 }}>
          <div className="ist-mono" style={{ fontSize: 10 }}>Creator trust</div>
          <strong>{creator?.trustScore ?? "—"}</strong>
        </div>
      </div>
      <button type="button" className="ist-btn ist-btn--primary" onClick={() => studio.actions.applyTrustImpactMock()}>
        Apply pending impacts
      </button>
    </div>
  );
}
