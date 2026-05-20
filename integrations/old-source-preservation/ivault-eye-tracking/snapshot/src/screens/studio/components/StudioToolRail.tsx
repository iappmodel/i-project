import type { StudioTool } from "../studioTypes";
import type { StudioController } from "../studioStore";

type RailTool = { id: StudioTool; label: string; icon: string };

/** Primary order: … Captions → Magic → Campaign → Verify → Export → Publish; extras after. */
const TOOLS: RailTool[] = [
  { id: "trim", label: "Trim", icon: "✂" },
  { id: "filters", label: "Filters", icon: "◐" },
  { id: "beauty", label: "Beauty", icon: "◇" },
  { id: "audio", label: "Audio", icon: "♪" },
  { id: "text", label: "Text", icon: "T" },
  { id: "stickers", label: "Stickers", icon: "★" },
  { id: "speed", label: "Speed", icon: "»" },
  { id: "captions", label: "Captions", icon: "≡" },
  { id: "magic", label: "Magic", icon: "✦" },
  { id: "campaign", label: "Campaign", icon: "◈" },
  { id: "verify", label: "Verify", icon: "✓" },
  { id: "export", label: "Export", icon: "↑" },
  { id: "publish", label: "Pub", icon: "⎘" },
  { id: "backend", label: "Backend", icon: "⎈" },
  { id: "effects", label: "FX", icon: "⚡" },
  { id: "blur_caf", label: "Blur", icon: "▣" },
  { id: "monetize", label: "$", icon: "◎" },
  { id: "rights_safety", label: "Safe", icon: "!" },
  { id: "runtime_feed", label: "Feed", icon: "▤" },
  { id: "creator_dashboard", label: "Cre", icon: "◎" },
];

export function StudioToolRail({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const active = project.activeTool;

  return (
    <div className="ist-tool-rail-h" role="tablist" aria-label="Studio tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`ist-tool-btn${active === t.id ? " ist-tool-btn--active" : ""}${t.id === "magic" ? " ist-tool-btn--magic" : ""}`}
          onClick={() => actions.setActiveTool(t.id)}
        >
          <div style={{ fontSize: 14, lineHeight: 1.1 }}>{t.icon}</div>
          <div>{t.label}</div>
        </button>
      ))}
    </div>
  );
}
