import type { StudioController } from "../studioStore";

export function AudioPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const clip =
    project.clips.find((c) => c.id === project.selectedClipId && c.type === "audio") ??
    project.clips.find((c) => c.type === "audio");

  const vol = Number(clip?.effects?.volume ?? 1);
  const muted = Boolean(clip?.muted);

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Audio</h3>
      {!clip ? (
        <p style={{ fontSize: 12, color: "var(--ist-muted)" }}>Select an audio clip or use the main mix track.</p>
      ) : (
        <>
          <div className="ist-field">
            <label className="ist-label">Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={vol}
              onChange={(e) =>
                actions.updateClip(clip.id, {
                  effects: { ...clip.effects, volume: Number(e.target.value) },
                })
              }
              style={{ width: "100%", accentColor: "#fbbf24" }}
            />
            <span className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
              {vol.toFixed(2)}
            </span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12 }}>
            <input type="checkbox" checked={muted} onChange={() => actions.updateClip(clip.id, { muted: !muted })} />
            Mute clip
          </label>
        </>
      )}
      <div className="ist-panel" style={{ marginTop: 8 }}>
        <div className="ist-label">Music bed</div>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
          Placeholder — no library wired.
        </p>
      </div>
      <div className="ist-panel" style={{ marginTop: 8 }}>
        <div className="ist-label">Voiceover</div>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
          Placeholder — record in Stage 2+.
        </p>
      </div>
    </div>
  );
}
