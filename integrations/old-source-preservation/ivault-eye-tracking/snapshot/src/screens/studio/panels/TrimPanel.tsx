import type { StudioClip } from "../studioTypes";
import type { StudioController } from "../studioStore";

export function TrimPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const clip = project.clips.find((c) => c.id === project.selectedClipId);

  const duplicate = (c: StudioClip) => {
    const span = c.timelineEndMs - c.timelineStartMs;
    let start = c.timelineEndMs;
    let end = start + span;
    if (end > project.durationMs) {
      end = project.durationMs;
      start = Math.max(0, end - span);
    }
    const copy: StudioClip = {
      ...c,
      id: `clip_dup_${Date.now()}`,
      name: `${c.name} · copy`,
      timelineStartMs: start,
      timelineEndMs: end,
      sourceStartMs: c.sourceStartMs,
      sourceEndMs: c.sourceEndMs,
    };
    actions.addClip(copy);
    actions.logEvent("studio.clip.duplicated", { fromClipId: c.id, toClipId: copy.id });
  };

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Trim</h3>
      {!clip ? (
        <p style={{ fontSize: 12, color: "var(--ist-muted)" }}>Select a clip on the timeline.</p>
      ) : (
        <>
          <div className="ist-field">
            <label className="ist-label">Selected clip</label>
            <div className="ist-mono" style={{ fontSize: 11 }}>
              {clip.name}
            </div>
          </div>
          <div className="ist-grid2">
            <div className="ist-field">
              <label className="ist-label">Start (ms)</label>
              <input
                className="ist-input ist-mono"
                type="number"
                value={clip.timelineStartMs}
                onChange={(e) =>
                  actions.trimClip(clip.id, Number(e.target.value), clip.timelineEndMs)
                }
              />
            </div>
            <div className="ist-field">
              <label className="ist-label">End (ms)</label>
              <input
                className="ist-input ist-mono"
                type="number"
                value={clip.timelineEndMs}
                onChange={(e) =>
                  actions.trimClip(clip.id, clip.timelineStartMs, Number(e.target.value))
                }
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="ist-btn" onClick={() => actions.splitClip(clip.id, project.playheadMs)}>
              Split at playhead
            </button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => duplicate(clip)}>
              Duplicate
            </button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.deleteClip(clip.id)}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
