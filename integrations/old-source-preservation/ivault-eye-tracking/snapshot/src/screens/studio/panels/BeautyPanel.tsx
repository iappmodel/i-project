import type { StudioController } from "../studioStore";

export function BeautyPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const clip =
    project.clips.find((c) => c.id === project.selectedClipId && c.type === "video") ??
    project.clips.find((c) => c.type === "video");
  const asset = clip?.assetId ? project.assets.find((a) => a.id === clip.assetId) : undefined;
  const hasVideoOrImage = Boolean(asset && (asset.type === "video" || asset.type === "image"));
  const b = clip?.effects?.beauty as Record<string, number> | undefined;

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Beauty</h3>
      <p style={{ fontSize: 11, color: "var(--ist-muted)", lineHeight: 1.45, marginBottom: 12 }}>
        Beauty edits are disabled for identity verification media.
      </p>
      {!hasVideoOrImage ? (
        <p style={{ fontSize: 11, color: "var(--ist-muted)" }}>Select a video or image clip to preview beauty controls (still read-only in Stage 1).</p>
      ) : null}
      {["smooth", "brighten", "sharpen", "faceLight"].map((key) => (
        <div key={key} className="ist-field">
          <label className="ist-label">{key}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled
            readOnly
            value={b?.[key] ?? 0}
            title="Disabled for identity verification media"
            style={{
              width: "100%",
              opacity: hasVideoOrImage ? 0.45 : 0.25,
              accentColor: "#fbbf24",
              cursor: "not-allowed",
            }}
          />
        </div>
      ))}
    </div>
  );
}
