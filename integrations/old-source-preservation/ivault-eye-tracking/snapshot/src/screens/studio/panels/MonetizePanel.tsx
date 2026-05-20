import type { StudioPostMonetizationKind } from "../studioTypes";
import type { StudioController } from "../studioStore";

const KINDS: StudioPostMonetizationKind[] = [
  "free",
  "earn_enabled",
  "sponsored",
  "paid",
  "subscriber_only",
  "tip_enabled",
  "campaign",
  "unlockable",
];

export function MonetizePanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const m = project.monetization;

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Monetize</h3>
      <div className="ist-field">
        <label className="ist-label">Post kind</label>
        <select
          className="ist-input"
          value={m.postKind}
          onChange={(e) => actions.updateMonetization({ postKind: e.target.value as StudioPostMonetizationKind })}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field" style={{ marginTop: 10 }}>
        <label className="ist-label">Earning rules</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
          {(
            [
              ["viewerEarnsOnWatch", "Viewer earns on watch"],
              ["viewerEarnsOnComplete", "Viewer earns on complete"],
              ["viewerEarnsOnUnlock", "Viewer earns on unlock"],
              ["creatorEarnsPerVerifiedView", "Creator per verified view"],
              ["creatorEarnsPerUnlock", "Creator per unlock"],
              ["brandPaysPerVerifiedAction", "Brand per verified action"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(m[key])}
                onChange={(e) => actions.updateMonetization({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="ist-grid2" style={{ marginTop: 10 }}>
        <div className="ist-field">
          <label className="ist-label">Min tip (coins)</label>
          <input
            className="ist-input ist-mono"
            type="number"
            value={m.minimumTipCoins ?? 0}
            onChange={(e) => actions.updateMonetization({ minimumTipCoins: Number(e.target.value) })}
          />
        </div>
        <div className="ist-field">
          <label className="ist-label">Fixed price</label>
          <input
            className="ist-input ist-mono"
            type="number"
            value={m.fixedPriceCoins ?? 0}
            onChange={(e) => actions.updateMonetization({ fixedPriceCoins: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="ist-field" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "0 0 8px" }}>
          Campaign budgets and paid unlocks are server-authoritative. Use Backend Readiness to mock-persist and review contracts.
        </p>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.setActiveTool("backend")}>
          Open Backend Readiness
        </button>
      </div>
    </div>
  );
}
