import type { StudioCAFSegment } from "../studioTypes";
import type { StudioController } from "../studioStore";

export function BlurCAFPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const seg = project.cafSegments[0];

  const addDemo = () => {
    const s: StudioCAFSegment = {
      id: `caf_${Date.now()}`,
      projectId: project.id,
      clipId: project.clips.find((c) => c.type === "video")?.id,
      timelineStartMs: 4000,
      timelineEndMs: 9000,
      shape: "rectangle",
      x: 0.1,
      y: 0.55,
      width: 0.35,
      height: 0.2,
      rotation: 0,
      trackingMode: "static",
      blurStrength: 32,
      renderMode: "blur",
      accessType: "free",
      status: "draft",
    };
    actions.addCaf(s);
  };

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Blur / CAF</h3>
      <p style={{ fontSize: 11, color: "var(--ist-muted)", marginTop: 0 }}>
        Controlled Access Fields — geometry + render + access type (demo wiring).
      </p>
      {!seg ? (
        <button type="button" className="ist-btn" onClick={addDemo}>
          Add sample CAF
        </button>
      ) : (
        <div className="ist-grid2">
          <div className="ist-field">
            <label className="ist-label">Blur strength</label>
            <input
              className="ist-input ist-mono"
              type="number"
              value={seg.blurStrength}
              onChange={(e) => actions.updateCaf(seg.id, { blurStrength: Number(e.target.value) })}
            />
          </div>
          <div className="ist-field">
            <label className="ist-label">Render</label>
            <select
              className="ist-input"
              value={seg.renderMode}
              onChange={(e) =>
                actions.updateCaf(seg.id, { renderMode: e.target.value as StudioCAFSegment["renderMode"] })
              }
            >
              {(["blur", "pixelate", "blackout", "frosted", "symbol", "hidden"] as const).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
            <label className="ist-label">Access</label>
            <input
              className="ist-input"
              value={seg.accessType}
              onChange={(e) => actions.updateCaf(seg.id, { accessType: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
