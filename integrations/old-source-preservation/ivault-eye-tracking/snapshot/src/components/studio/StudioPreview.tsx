import React from "react";
import type { StudioSession, StudioClip, StudioRecordingState, StudioEditPlan, StudioPublishPlan, StudioProofPlan } from "../../lib/studio/studio.types";
import { formatRecordingElapsed } from "../../lib/studio/studio-copy";

type Props = {
  session: StudioSession;
  selectedClip: StudioClip | null;
  isPlaying: boolean;
  recording: StudioRecordingState;
  selectedEditPlan: StudioEditPlan | null;
  selectedPublishPlan: StudioPublishPlan | null;
  selectedProofPlan: StudioProofPlan | null;
  onPlayPause?: () => void;
};

function recordingOverlayLabel(status: StudioRecordingState["status"]): string | null {
  if (status === "recording") return "● REC";
  if (status === "paused") return "⏸ PAUSED";
  if (status === "stopped") return "■ STOPPED";
  return null;
}

function overlayColor(status: StudioRecordingState["status"]): string {
  if (status === "recording") return "#ff4444";
  if (status === "paused") return "#f08c28";
  return "#9fa8c0";
}

const StudioPreview: React.FC<Props> = ({ session, selectedClip, isPlaying, recording, selectedEditPlan, selectedPublishPlan, selectedProofPlan, onPlayPause }) => {
  const title = selectedClip ? selectedClip.title : session.title;
  const overlayLabel = recordingOverlayLabel(recording.status);

  return (
    <div style={{ width: 560, height: 315, background: "linear-gradient(180deg,#0b1220,#071028)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Title */}
      <div style={{ position: "absolute", top: 10, left: 12, color: "#9fb4d8", fontSize: 13 }}>{title}</div>

      {/* Top-right badges */}
      <div style={{ position: "absolute", top: 10, right: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        {session.targetDurationSeconds ? (
          <div style={{ background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}>
            {session.targetDurationSeconds}s target
          </div>
        ) : null}
        {selectedEditPlan ? (
          <div style={{ background: "rgba(94,188,255,0.12)", padding: "3px 8px", borderRadius: 6, fontSize: 12, color: "#5ebcff", fontWeight: 700 }}>
            AUTO-CUT PREVIEW · {selectedEditPlan.estimatedDurationSeconds.toFixed(1)}s
          </div>
        ) : null}
        {selectedPublishPlan ? (
          <div style={{ background: "rgba(167,139,250,0.12)", padding: "3px 8px", borderRadius: 6, fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>
            PUBLISH PLAN · {selectedPublishPlan.destinations.join(", ")}
          </div>
        ) : null}
        {selectedProofPlan ? (
          <div
            style={{
              background:
                selectedProofPlan.originalityStatus === "likely_original"
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(251,146,60,0.12)",
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 12,
              color:
                selectedProofPlan.originalityStatus === "likely_original" ? "#22c55e" : "#fb923c",
              fontWeight: 700,
            }}
          >
            {selectedProofPlan.originalityStatus === "likely_original" ? "PROOF READY" : "PROOF REVIEW"} · {selectedProofPlan.originalityScore}/100
          </div>
        ) : null}
      </div>

      {/* Recording overlay */}
      {overlayLabel ? (
        <div style={{ position: "absolute", top: 36, left: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: overlayColor(recording.status), letterSpacing: 1 }}>
            {overlayLabel}
          </div>
          <div style={{ fontSize: 12, color: "#9aa4b2" }}>
            {formatRecordingElapsed(recording.elapsedSeconds)}
          </div>
          {recording.activeTakeId ? (
            <div style={{ fontSize: 11, color: "#748099" }}>Take: {recording.activeTakeId}</div>
          ) : null}
        </div>
      ) : null}

      {/* Center content */}
      <div style={{ color: "#cfe8ff", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{isPlaying ? "Playing" : "Preview"}</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>
          {selectedClip ? `${selectedClip.durationSeconds}s clip` : `${session.rawDurationSeconds}s session`}
        </div>
      </div>

      {/* Play/Pause */}
      <button onClick={onPlayPause} style={{ position: "absolute", bottom: 12, right: 12, padding: "6px 10px", borderRadius: 8 }}>
        {isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
};

export default StudioPreview;
