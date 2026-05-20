import React from "react";
import type { StudioSession, StudioRecordingState } from "../../lib/studio/studio.types";
import { studioCopy } from "../../lib/studio/studio-copy";

type Props = {
  session: StudioSession;
  recording: StudioRecordingState;
  onBack?: () => void;
  onToggleExport?: () => void;
  onCycleAspect?: () => void;
};

function recordingPillStyle(status: StudioRecordingState["status"]): React.CSSProperties {
  const base: React.CSSProperties = { padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const };
  if (status === "recording") {
    return { ...base, background: "rgba(220,40,40,0.18)", color: "#ff5555", boxShadow: "0 0 8px 2px rgba(220,40,40,0.35)" };
  }
  if (status === "paused") {
    return { ...base, background: "rgba(240,140,40,0.14)", color: "#f08c28" };
  }
  if (status === "stopped") {
    return { ...base, background: "rgba(90,90,120,0.18)", color: "#9fa8c0" };
  }
  if (status === "analyzing") {
    return { ...base, background: "rgba(80,160,255,0.14)", color: "#5ebcff" };
  }
  // idle
  return { ...base, background: "rgba(255,255,255,0.04)", color: "#748099" };
}

const StudioTopBar: React.FC<Props> = ({ session, recording, onBack, onToggleExport, onCycleAspect }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
    <button onClick={onBack} style={{ background: "transparent", border: "none", color: "inherit" }}>←</button>
    <div style={{ fontWeight: 700 }}>{studioCopy.title}</div>
    <div style={{ opacity: 0.8, marginLeft: 8 }}>{session.title}</div>
    <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
      {/* Recording status pill */}
      <div style={recordingPillStyle(recording.status)}>
        {recording.status === "recording" ? "● " : ""}{recording.status}
      </div>
      {/* Take count */}
      <div style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", fontSize: 12, color: "#9aa4b2" }}>
        Takes: {recording.takeCount}
      </div>
      <div style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.02)", fontSize: 13 }}>{session.status}</div>
      <button onClick={onCycleAspect} style={{ padding: "6px 8px", borderRadius: 6 }}>{session.aspectRatio}</button>
      <button onClick={onToggleExport} style={{ padding: "6px 8px", borderRadius: 6 }}>Export</button>
    </div>
  </div>
);

export default StudioTopBar;
