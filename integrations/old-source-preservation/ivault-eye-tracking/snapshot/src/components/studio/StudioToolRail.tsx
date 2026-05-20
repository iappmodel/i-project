import React from "react";
import type { StudioToolId } from "../../lib/studio/studio.types";

type Props = { activeTool: StudioToolId; onSetTool: (t: StudioToolId) => void };

const TOOLS: { id: StudioToolId; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "trim", label: "Trim" },
  { id: "captions", label: "Captions" },
  { id: "audio", label: "Audio" },
  { id: "effects", label: "Effects" },
  { id: "beauty", label: "Beauty" },
  { id: "crop", label: "Crop" },
  { id: "magic", label: "Magic" },
  { id: "proof", label: "Proof" },
  { id: "publish", label: "Publish" },
  { id: "cleanup", label: "Cleanup" },
];

const StudioToolRail: React.FC<Props> = ({ activeTool, onSetTool }) => (
  <div style={{ width: 160, padding: 12, borderRight: "1px solid rgba(255,255,255,0.03)" }}>
    <div style={{ fontSize: 13, color: "#9aa4b2", marginBottom: 8 }}>Tools</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {TOOLS.map((t) => (
        <button key={t.id} onClick={() => onSetTool(t.id)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: activeTool === t.id ? "linear-gradient(90deg,#0f172a,#14213d)" : "transparent", color: activeTool === t.id ? "#fff" : "#d6dbe2" }}>
          {t.label}
        </button>
      ))}
    </div>
  </div>
);

export default StudioToolRail;

