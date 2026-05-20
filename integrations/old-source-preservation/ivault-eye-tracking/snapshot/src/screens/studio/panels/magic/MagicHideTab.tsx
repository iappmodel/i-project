import type { HiddenRenderMode, MagicReveal, MagicRevealGeometry, RevealTargetType, RevealTrackingMode } from "../../studioTypes";
import type { StudioActions } from "../../studioStore";

const HIDDEN: HiddenRenderMode[] = ["blur", "pixelate", "blackout", "frosted", "symbol", "teaser_overlay"];
const TARGETS: { id: RevealTargetType; label: string }[] = [
  { id: "region", label: "Region" },
  { id: "clip_segment", label: "Clip segment" },
  { id: "full_post", label: "Full post" },
  { id: "audio_segment", label: "Audio segment" },
  { id: "caption_segment", label: "Caption segment" },
  { id: "download_asset", label: "Download asset" },
];
const SHAPES: MagicRevealGeometry["shape"][] = ["rectangle", "ellipse", "polygon", "mask", "tracked_object"];
const TRACK: RevealTrackingMode[] = ["none", "manual_keyframes", "face_tracking", "object_tracking", "screen_tracking"];

export function MagicHideTab({ reveal, actions }: { reveal: MagicReveal; actions: StudioActions }) {
  const g = reveal.geometry ?? { shape: "rectangle" as const, x: 0.2, y: 0.3, width: 0.4, height: 0.25, rotation: 0 };

  return (
    <div className="ist-grid2">
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Target type</label>
        <select
          className="ist-input"
          value={reveal.targetType}
          onChange={(e) => actions.updateMagicTargetType(reveal.id, e.target.value as RevealTargetType)}
        >
          {TARGETS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label className="ist-label">Hidden look</label>
        <select
          className="ist-input"
          value={reveal.hiddenRender.mode}
          onChange={(e) =>
            actions.updateMagicHiddenRender(reveal.id, {
              ...reveal.hiddenRender,
              mode: e.target.value as HiddenRenderMode,
            })
          }
        >
          {HIDDEN.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label className="ist-label">Strength (0–100)</label>
        <input
          className="ist-input ist-mono"
          type="range"
          min={0}
          max={100}
          value={reveal.hiddenRender.strength}
          onChange={(e) =>
            actions.updateMagicHiddenRender(reveal.id, {
              ...reveal.hiddenRender,
              strength: Number(e.target.value),
            })
          }
        />
        <span className="ist-mono" style={{ fontSize: 10 }}>
          {reveal.hiddenRender.strength}
        </span>
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Overlay text</label>
        <input
          className="ist-input"
          value={reveal.hiddenRender.overlayText ?? ""}
          onChange={(e) =>
            actions.updateMagicHiddenRender(reveal.id, {
              ...reveal.hiddenRender,
              overlayText: e.target.value,
            })
          }
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Shape</label>
        <select
          className="ist-input"
          value={g.shape}
          onChange={(e) =>
            actions.updateMagicGeometry(reveal.id, {
              ...g,
              shape: e.target.value as MagicRevealGeometry["shape"],
            })
          }
        >
          {SHAPES.map((s) => (
            <option key={s} value={s}>
              {s}
              {s === "polygon" || s === "tracked_object" ? " (mock)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label className="ist-label">Tracking</label>
        <select
          className="ist-input"
          value={reveal.tracking.mode}
          onChange={(e) =>
            actions.updateMagicTracking(reveal.id, {
              ...reveal.tracking,
              mode: e.target.value as RevealTrackingMode,
            })
          }
        >
          {TRACK.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label className="ist-label">X</label>
        <input
          className="ist-input ist-mono"
          type="number"
          step={0.01}
          value={g.x}
          onChange={(e) => actions.updateMagicGeometry(reveal.id, { ...g, x: Number(e.target.value) })}
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Y</label>
        <input
          className="ist-input ist-mono"
          type="number"
          step={0.01}
          value={g.y}
          onChange={(e) => actions.updateMagicGeometry(reveal.id, { ...g, y: Number(e.target.value) })}
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Width</label>
        <input
          className="ist-input ist-mono"
          type="number"
          step={0.01}
          value={g.width}
          onChange={(e) => actions.updateMagicGeometry(reveal.id, { ...g, width: Number(e.target.value) })}
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Height</label>
        <input
          className="ist-input ist-mono"
          type="number"
          step={0.01}
          value={g.height}
          onChange={(e) => actions.updateMagicGeometry(reveal.id, { ...g, height: Number(e.target.value) })}
        />
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Rotation (deg)</label>
        <input
          className="ist-input ist-mono"
          type="number"
          value={g.rotation}
          onChange={(e) => actions.updateMagicGeometry(reveal.id, { ...g, rotation: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
