import type { StudioController } from "../studioStore";

function trackGlyph(type: string): string {
  switch (type) {
    case "video":
      return "V";
    case "audio":
      return "A";
    case "subtitle":
      return "C";
    case "text":
      return "T";
    case "effect":
    case "filter":
      return "Fx";
    case "compliance":
      return "!";
    case "magic_reserved":
    case "magic":
      return "✦";
    default:
      return "?";
  }
}

export function StudioLayerRail({ studio }: { studio: StudioController }) {
  const { project, inspectorOpen } = studio.state;
  const { actions } = studio;
  const ordered = [...project.tracks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <aside className="ist-studio-layer-rail" aria-label="Layer rail">
      {ordered.map((tr) => {
        const on = project.selectedTrackId === tr.id;
        return (
          <button
            key={tr.id}
            type="button"
            className={`ist-layer-rail-btn ${on ? "ist-layer-rail-btn--on" : ""}`}
            title={tr.name}
            onClick={() => actions.selectTrack(tr.id)}
          >
            {trackGlyph(tr.type)}
          </button>
        );
      })}
      <div style={{ flex: 1, minHeight: 8 }} />
      <button
        type="button"
        className="ist-layer-rail-btn"
        title={inspectorOpen ? "Inspector visible" : "Show inspector"}
        onClick={() => actions.setInspectorOpen(!inspectorOpen)}
      >
        {inspectorOpen ? "»" : "«"}
      </button>
    </aside>
  );
}
