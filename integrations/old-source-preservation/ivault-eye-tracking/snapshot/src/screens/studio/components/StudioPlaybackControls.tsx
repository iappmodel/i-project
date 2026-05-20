import { useEffect, useRef } from "react";
import type { StudioController } from "../studioStore";

function formatTc(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function StudioPlaybackControls({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { dispatch } = studio;
  const tickRef = useRef<number | null>(null);
  const playheadRef = useRef(project.playheadMs);
  const durationRef = useRef(project.durationMs);
  playheadRef.current = project.playheadMs;
  durationRef.current = project.durationMs;

  useEffect(() => {
    if (!project.isPlaying) {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = window.setInterval(() => {
      const next = playheadRef.current + 200;
      const dur = Math.max(durationRef.current, 1);
      if (next >= dur) {
        dispatch({ type: "SET_PLAYHEAD", playheadMs: dur });
        dispatch({ type: "SET_PLAYING", isPlaying: false });
      } else {
        dispatch({ type: "SET_PLAYHEAD", playheadMs: next });
      }
    }, 200);
    return () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
    };
  }, [project.isPlaying, project.durationMs, dispatch]);

  const dur = Math.max(project.durationMs, 1);
  const pct = (project.playheadMs / dur) * 100;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "10px 12px",
        background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.85))",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        className="ist-mono"
        style={{
          height: 4,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          cursor: "pointer",
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
          dispatch({ type: "SET_PLAYHEAD", playheadMs: Math.round(p * project.durationMs) });
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#5eead4,#fbbf24)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          onClick={() => dispatch({ type: "SET_PLAYHEAD", playheadMs: Math.max(0, project.playheadMs - 10_000) })}
        >
          −10s
        </button>
        <button type="button" className="ist-btn ist-btn--primary" onClick={() => dispatch({ type: "TOGGLE_PLAYBACK" })}>
          {project.isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          onClick={() => dispatch({ type: "SET_PLAYHEAD", playheadMs: Math.min(project.durationMs, project.playheadMs + 10_000) })}
        >
          +10s
        </button>
        <span className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>
          {formatTc(project.playheadMs)} / {formatTc(project.durationMs)}
        </span>
      </div>
    </div>
  );
}
