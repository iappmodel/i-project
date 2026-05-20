import type { AspectRatio, StudioMode } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { StudioStatusBadge } from "./StudioStatusBadge";
import { useRuntimeFeed } from "../feed/RuntimeFeedContext";
import { RUNTIME_STUDIO_SLOT_ID } from "../feed/studioFeedMockData";

const ASPECT_ORDER: AspectRatio[] = ["9:16", "1:1", "4:5", "16:9", "original"];

export function StudioTopBar({ studio, onBack }: { studio: StudioController; onBack?: () => void }) {
  const { project } = studio.state;
  const { actions } = studio;
  const { feedDispatch } = useRuntimeFeed();
  const published = project.publishStatus === "published";

  const cycleAspect = () => {
    const i = ASPECT_ORDER.indexOf(project.aspectRatio);
    const next = ASPECT_ORDER[(i + 1) % ASPECT_ORDER.length] ?? "9:16";
    actions.setAspectRatio(next);
  };

  const errs = project.publishValidationErrors ?? [];

  return (
    <div className="ist-studio-topbar-stack">
    <header className="ist-studio-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          style={{ padding: "6px 10px" }}
          onClick={() => (onBack ? onBack() : actions.logEvent("studio.nav.back", {}))}
        >
          ←
        </button>
        <span className="ist-display" style={{ fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
          Studio
        </span>
        <span
          className="ist-mono"
          style={{ fontSize: 12, color: "var(--ist-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={project.title}
        >
          {project.title}
        </span>
        <StudioStatusBadge status={project.status} />
      </div>

      <div className="ist-segmented" style={{ flexShrink: 0 }} role="group" aria-label="Edit mode">
        {(["manual", "hybrid", "ai"] as const satisfies readonly StudioMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={project.mode === m ? "ist-segmented--active" : ""}
            onClick={() => actions.setMode(m)}
          >
            {m === "ai" ? "AI" : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.undo()} title="Undo">
          Undo
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.redo()} title="Redo">
          Redo
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.saveProject()}>
          Save
        </button>
        <button type="button" className="ist-btn ist-btn--ghost ist-mono" onClick={cycleAspect} title="Cycle aspect ratio">
          {project.aspectRatio}
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.setActiveTool("export")}>
          Export
        </button>
        <button type="button" className="ist-btn ist-btn--primary" onClick={() => actions.openPublishPanel()} title="Open publish pipeline (caption, scans, export, publish)">
          Publish
        </button>
        {published ? (
          <>
            <button
              type="button"
              className="ist-btn ist-btn--ghost"
              onClick={() => {
                feedDispatch({ type: "SET_ACTIVE_POST", postId: RUNTIME_STUDIO_SLOT_ID });
                actions.setActiveTool("runtime_feed");
              }}
            >
              Feed preview
            </button>
            <button
              type="button"
              className="ist-btn ist-btn--ghost"
              onClick={() => {
                feedDispatch({ type: "OPEN_CREATOR_DASHBOARD", postId: RUNTIME_STUDIO_SLOT_ID });
                actions.setActiveTool("creator_dashboard");
              }}
            >
              Creator dashboard
            </button>
          </>
        ) : null}
      </div>
    </header>
      {errs.length > 0 ? (
        <div className="ist-studio-topbar-errors ist-mono" role="alert">
          {errs.map((e) => (
            <div key={e}>· {e}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
