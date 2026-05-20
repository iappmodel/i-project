import type { StudioTextOverlay } from "../studioTypes";
import type { StudioController } from "../studioStore";

const COLORS = ["#ecfccb", "#5eead4", "#fbbf24", "#fda4af", "#e2e8f0"];

export function TextPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const textClip = project.clips.find((c) => c.id === project.selectedClipId && c.type === "text");
  const overlay =
    (textClip && project.overlays.find((o) => o.clipId === textClip.id)) ??
    project.overlays.find((o) => project.playheadMs >= o.startMs && project.playheadMs <= o.endMs);

  const addText = () => {
    const id = `ovr_${Date.now()}`;
    const o: StudioTextOverlay = {
      id,
      clipId: textClip?.id,
      text: "NEW LABEL",
      x: 0.1,
      y: 0.72,
      fontSize: 20,
      color: "#ecfccb",
      startMs: project.playheadMs,
      endMs: Math.min(project.durationMs, project.playheadMs + 4_000),
    };
    actions.addOverlay(o);
  };

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Text</h3>
      <button type="button" className="ist-btn ist-btn--primary" style={{ marginBottom: 12 }} onClick={addText}>
        Add text
      </button>
      {!overlay ? (
        <p style={{ fontSize: 12, color: "var(--ist-muted)" }}>No text overlay at playhead. Add text or move the playhead over an overlay.</p>
      ) : (
        <>
          <div className="ist-field">
            <label className="ist-label">Content</label>
            <textarea
              className="ist-textarea"
              value={overlay.text}
              onChange={(e) => actions.updateOverlay(overlay.id, { text: e.target.value })}
            />
          </div>
          <div className="ist-field">
            <label className="ist-label">Font size</label>
            <input
              className="ist-input ist-mono"
              type="number"
              min={10}
              max={72}
              value={overlay.fontSize}
              onChange={(e) => actions.updateOverlay(overlay.id, { fontSize: Number(e.target.value) })}
            />
          </div>
          <div className="ist-label">Color</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: overlay.color === c ? "2px solid #fff" : "1px solid var(--ist-line)",
                  background: c,
                  cursor: "pointer",
                }}
                title={c}
                onClick={() => actions.updateOverlay(overlay.id, { color: c })}
              />
            ))}
          </div>
          <div className="ist-field">
            <label className="ist-label">Window (ms)</label>
            <div className="ist-grid2">
              <input
                className="ist-input ist-mono"
                type="number"
                value={overlay.startMs}
                onChange={(e) => actions.updateOverlay(overlay.id, { startMs: Number(e.target.value) })}
              />
              <input
                className="ist-input ist-mono"
                type="number"
                value={overlay.endMs}
                onChange={(e) => actions.updateOverlay(overlay.id, { endMs: Number(e.target.value) })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
