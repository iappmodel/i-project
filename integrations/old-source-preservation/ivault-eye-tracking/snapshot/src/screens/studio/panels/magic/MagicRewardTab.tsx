import type { MagicCoin, MagicReveal } from "../../studioTypes";
import type { StudioActions } from "../../studioStore";

const defaultReward = (r: MagicReveal): NonNullable<MagicReveal["reward"]> => ({
  viewerRewardEnabled: r.reward?.viewerRewardEnabled ?? false,
  viewerRewardCoin: r.reward?.viewerRewardCoin ?? "iCoin",
  viewerRewardAmount: r.reward?.viewerRewardAmount ?? 0,
  creatorRewardEnabled: r.reward?.creatorRewardEnabled ?? false,
  creatorRewardCoin: r.reward?.creatorRewardCoin ?? "iCoin",
  creatorRewardAmount: r.reward?.creatorRewardAmount ?? 0,
});

export function MagicRewardTab({ reveal, actions }: { reveal: MagicReveal; actions: StudioActions }) {
  const rw = defaultReward(reveal);

  return (
    <div className="ist-grid2">
      <p className="ist-mono" style={{ fontSize: 11, gridColumn: "1 / -1", lineHeight: 1.6, color: "var(--ist-muted)" }}>
        Viewer rewards only settle after verification. Creator rewards settle into pending balance first. Sponsor-funded watch reveals can reward both viewer and creator.
      </p>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={rw.viewerRewardEnabled}
            onChange={(e) => actions.updateMagicReward(reveal.id, { ...rw, viewerRewardEnabled: e.target.checked })}
          />
          Viewer reward enabled
        </label>
      </div>
      <div className="ist-field">
        <label className="ist-label">Viewer coin</label>
        <select
          className="ist-input"
          value={rw.viewerRewardCoin ?? "iCoin"}
          onChange={(e) => actions.updateMagicReward(reveal.id, { ...rw, viewerRewardCoin: e.target.value as MagicCoin })}
        >
          {(["iCoin", "vCoin", "aCoin", "uCoin"] as const).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label className="ist-label">Viewer amount</label>
        <input
          className="ist-input ist-mono"
          type="number"
          step={0.01}
          value={rw.viewerRewardAmount ?? 0}
          onChange={(e) => actions.updateMagicReward(reveal.id, { ...rw, viewerRewardAmount: Number(e.target.value) })}
        />
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={rw.creatorRewardEnabled}
            onChange={(e) => actions.updateMagicReward(reveal.id, { ...rw, creatorRewardEnabled: e.target.checked })}
          />
          Creator reward enabled
        </label>
      </div>
      <div className="ist-field">
        <label className="ist-label">Creator coin</label>
        <select
          className="ist-input"
          value={rw.creatorRewardCoin ?? "iCoin"}
          onChange={(e) => actions.updateMagicReward(reveal.id, { ...rw, creatorRewardCoin: e.target.value as MagicCoin })}
        >
          {(["iCoin", "vCoin", "aCoin", "uCoin"] as const).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label className="ist-label">Creator amount</label>
        <input
          className="ist-input ist-mono"
          type="number"
          step={0.01}
          value={rw.creatorRewardAmount ?? 0}
          onChange={(e) => actions.updateMagicReward(reveal.id, { ...rw, creatorRewardAmount: Number(e.target.value) })}
        />
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Preview</label>
        <div className="ist-mono" style={{ fontSize: 11, lineHeight: 1.7 }}>
          Viewer: {rw.viewerRewardEnabled ? `+${rw.viewerRewardAmount ?? 0} ${rw.viewerRewardCoin ?? "iCoin"} after verified reveal` : "—"}
          <br />
          Creator: {rw.creatorRewardEnabled ? `+${rw.creatorRewardAmount ?? 0} ${rw.creatorRewardCoin ?? "iCoin"} pending` : "—"}
        </div>
      </div>
    </div>
  );
}
