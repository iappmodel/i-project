import type { StudioController } from "../studioStore";

const PRESETS = [0.5, 1, 1.5, 2] as const;

export function SpeedPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const clip = project.clips.find((c) => c.id === project.selectedClipId) ?? project.clips.find((c) => c.type === "video");
  const rate = Number(clip?.effects?.playbackRate ?? 1);

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Speed</h3>
      {!clip ? (
        <p style={{ fontSize: 12, color: "var(--ist-muted)" }}>Select a clip.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`ist-btn${Math.abs(rate - p) < 0.01 ? " ist-btn--primary" : ""}`}
                onClick={() =>
                  actions.updateClip(clip.id, {
                    effects: { ...clip.effects, playbackRate: p },
                  })
                }
              >
                {p}×
              </button>
            ))}
          </div>
          <div className="ist-field">
            <label className="ist-label">Custom</label>
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.05}
              value={rate}
              onChange={(e) =>
                actions.updateClip(clip.id, {
                  effects: { ...clip.effects, playbackRate: Number(e.target.value) },
                })
              }
              style={{ width: "100%", accentColor: "#a855f7" }}
            />
            <span className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
              {rate.toFixed(2)}×
            </span>
          </div>
        </>
      )}
    </div>
  );
}
