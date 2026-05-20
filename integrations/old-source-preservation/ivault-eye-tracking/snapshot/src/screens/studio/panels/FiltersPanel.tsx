import type { StudioController } from "../studioStore";

const CHIPS = [
  { id: "neutral", label: "Neutral" },
  { id: "mint_lift", label: "Mint lift" },
  { id: "gold_hour", label: "Gold hour" },
  { id: "mono", label: "B&W" },
  { id: "cool", label: "Cool" },
] as const;

export function FiltersPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const clip = project.clips.find((c) => c.id === project.selectedClipId) ?? project.clips.find((c) => c.type === "filter" || c.type === "video");

  const intensity = Number(clip?.effects?.intensity ?? 0.55);

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Filters</h3>
      {!clip ? (
        <p style={{ fontSize: 12, color: "var(--ist-muted)" }}>Select a clip to preview filter mock.</p>
      ) : (
        <>
          <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginTop: 0 }}>
            Target: {clip.name}
          </p>
          <div className="ist-tabs" style={{ marginBottom: 12 }}>
            {CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ist-tab${String(clip.effects?.filterId ?? "") === c.id ? " ist-tab--on" : ""}`}
                onClick={() =>
                  actions.updateClip(clip.id, {
                    effects: { ...clip.effects, filterId: c.id },
                  })
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="ist-field">
            <label className="ist-label">Intensity</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={intensity}
              onChange={(e) =>
                actions.updateClip(clip.id, {
                  effects: { ...clip.effects, intensity: Number(e.target.value) },
                })
              }
              style={{ width: "100%", accentColor: "#5eead4" }}
            />
            <span className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
              {intensity.toFixed(2)}
            </span>
          </div>
          <button type="button" className="ist-btn ist-btn--primary" onClick={() => actions.logEvent("studio.filter.applied_mock", { clipId: clip.id })}>
            Apply (mock)
          </button>
        </>
      )}
    </div>
  );
}
