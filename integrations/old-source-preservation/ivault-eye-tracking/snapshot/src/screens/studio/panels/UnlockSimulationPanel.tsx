import type { StudioController } from "../studioStore";
import { StudioUnlockSimulator } from "../components/StudioUnlockSimulator";

export function UnlockSimulationPanel({ studio }: { studio: StudioController }) {
  const { actions } = studio;
  if (!studio.state.unlockSimulatorOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Unlock simulation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 88,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
      }}
      onClick={() => actions.closeUnlockSimulator()}
    >
      <div
        className="ist-panel"
        style={{
          width: "min(560px, 100%)",
          maxHeight: "min(92vh, 900px)",
          overflow: "auto",
          padding: 16,
          marginTop: 12,
          borderColor: "rgba(94,234,212,0.35)",
          background: "rgba(15,23,42,0.92)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div>
            <h3 className="ist-panel__title" style={{ margin: 0 }}>
              Unlock simulation
            </h3>
            <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "6px 0 0", lineHeight: 1.5 }}>
              Local product simulation — no backend, no real money. Confirms append ledger rows and update mock balances.
            </p>
          </div>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.closeUnlockSimulator()}>
            Close
          </button>
        </div>
        <StudioUnlockSimulator studio={studio} />
      </div>
    </div>
  );
}
