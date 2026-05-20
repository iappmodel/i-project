import type { StudioRevealUnlock } from "../wallet/studioWalletTypes";
import type { StudioController } from "../studioStore";

export type StudioVerificationGateProps = {
  studio: StudioController;
  unlock?: StudioRevealUnlock;
};

export function StudioVerificationGate({ studio, unlock }: StudioVerificationGateProps) {
  const { actions } = studio;
  if (!unlock) {
    return (
      <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
        Select an unlock in the ledger or run a simulation to see verification state.
      </div>
    );
  }

  const v = unlock.verificationStatus;
  const isWatch = unlock.unlockAction === "watch_ad";

  return (
    <div className="ist-panel" style={{ padding: 10, borderColor: "rgba(251,191,36,0.25)", background: "rgba(15,23,42,0.5)" }}>
      <div className="ist-display" style={{ fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
        Verification · {v}
      </div>
      {isWatch ? (
        <ul className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "0 0 8px", paddingLeft: 16, lineHeight: 1.5 }}>
          <li>Attention verified (mock)</li>
          <li>Sponsor completion (mock)</li>
          <li>Reward eligible after verify</li>
        </ul>
      ) : (
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "0 0 8px" }}>
          {v === "not_required" ? "No verification step for this unlock type." : "Verification applies to watch / reward paths in this simulation."}
        </p>
      )}
      <button
        type="button"
        className="ist-btn ist-btn--ghost"
        disabled={v === "verified" || (v === "not_required" && !isWatch)}
        onClick={() => actions.mockVerifyUnlock(unlock.id)}
      >
        Run verification (mock)
      </button>
      {v === "verified" ? (
        <p className="ist-mono" style={{ fontSize: 9, color: "#86efac", margin: "8px 0 0" }}>
          Verified — viewer reward path applied per ledger rules. Creator share stays pending until settlement release.
        </p>
      ) : null}
    </div>
  );
}
