import { useRef } from "react";
import type { MagicReveal, StudioClip, StudioTrack } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { countUnlocksForReveal, findWalletAccountByType, pendingSettlementForReveal } from "../wallet/studioWalletUi";

function formatTc(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function clipClass(clip: StudioClip): string {
  if (clip.type === "audio") return "ist-clip ist-clip--audio";
  if (clip.type === "caption" || clip.type === "subtitle") return "ist-clip ist-clip--video";
  if (clip.type === "text") return "ist-clip ist-clip--video";
  if (clip.type === "marker") return "ist-clip ist-clip--reserved";
  if (clip.type === "filter" || clip.type === "effect") return "ist-clip ist-clip--magic";
  return "ist-clip ist-clip--video";
}

function magicRevealAccent(m: MagicReveal): string {
  if (m.safety.safetyStatus === "blocked" || m.status === "blocked") return "linear-gradient(90deg, rgba(251,113,133,0.5), rgba(251,113,133,0.15))";
  if (m.revealType === "always_hidden") return "linear-gradient(90deg, rgba(96,165,250,0.45), rgba(96,165,250,0.12))";
  if (m.revealType === "watch_to_reveal") return "linear-gradient(90deg, rgba(251,191,36,0.5), rgba(251,191,36,0.12))";
  if (m.revealType === "age_to_reveal" || m.safety.ageGateRequired) return "linear-gradient(90deg, rgba(251,113,133,0.4), rgba(251,191,36,0.12))";
  if (m.revealType === "trust_to_reveal") return "linear-gradient(90deg, rgba(168,85,247,0.5), rgba(168,85,247,0.12))";
  if (m.revealType === "collective_reveal") return "linear-gradient(90deg, rgba(94,234,212,0.45), rgba(190,242,100,0.15))";
  if (m.revealType === "tip_to_reveal" || m.revealType === "pay_to_reveal")
    return "linear-gradient(90deg, rgba(190,242,100,0.45), rgba(94,234,212,0.12))";
  return "linear-gradient(90deg, rgba(168,85,247,0.4), rgba(94,234,212,0.1))";
}

function magicRevealLabel(m: MagicReveal): string {
  const short = m.name.length > 18 ? `${m.name.slice(0, 16)}…` : m.name;
  if (m.pricing && (m.revealType === "tip_to_reveal" || m.revealType === "pay_to_reveal")) {
    return `${short} · ${m.pricing.amount} ${m.pricing.coin}`;
  }
  return short;
}

function magicTimelineBadge(m: MagicReveal): string {
  if (m.status === "blocked" || m.safety.safetyStatus === "blocked" || m.safety.publishBlocked) return "Blocked";
  if (m.revealType === "always_hidden" || m.safety.safetyClass === "privacy_sensitive") return "Privacy";
  if (m.revealType === "tip_to_reveal") return "Tip";
  if (m.revealType === "pay_to_reveal") return "Pay";
  if (m.revealType === "watch_to_reveal") return "Watch";
  if (m.revealType === "age_to_reveal") return "Age";
  if (m.revealType === "collective_reveal") return "Collective";
  return "";
}

export function StudioTimeline({ studio }: { studio: StudioController }) {
  const { project, unlocks, walletAccounts } = studio.state;
  const { actions, dispatch } = studio;
  const viewer = findWalletAccountByType(walletAccounts, "viewer");
  const rulerRef = useRef<HTMLDivElement>(null);
  const duration = Math.max(project.durationMs, 1);
  const zoom = Math.max(0.5, Math.min(project.zoom, 3));
  const innerPct = zoom * 100;

  const orderedTracks = [...project.tracks].sort((a, b) => a.sortOrder - b.sortOrder);

  const setPlayheadFromClientX = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const innerW = r.width;
    const x = Math.min(innerW, Math.max(0, clientX - r.left));
    const ratio = x / innerW;
    actions.setPlayhead(Math.round(ratio * duration));
  };

  const renderTrackRow = (tr: StudioTrack) => {
    const reserved = tr.type === "magic_reserved";
    const isMagicTrack = tr.type === "magic";
    const trackClips = project.clips.filter((c) => c.trackId === tr.id);
    const magicBlocks = isMagicTrack ? project.magicReveals.filter((m) => m.status !== "deleted") : [];
    const disabled = (reserved && !isMagicTrack) || tr.locked;

    return (
      <div key={tr.id} className={`ist-track-row${reserved && !isMagicTrack ? " ist-track-row--reserved" : ""}`}>
        <div className="ist-track-label">
          <button
            type="button"
            className="ist-btn ist-btn--ghost"
            style={{ padding: "0 4px", fontSize: 9, opacity: disabled ? 0.35 : 1 }}
            disabled={disabled}
            onClick={() => !disabled && actions.toggleTrackVisibility(tr.id)}
            title="Visibility"
          >
            {tr.visible ? "◉" : "○"}
          </button>
          <button
            type="button"
            className="ist-btn ist-btn--ghost"
            style={{ padding: "0 4px", fontSize: 9, opacity: disabled ? 0.35 : 1 }}
            disabled={disabled}
            onClick={() => !disabled && actions.toggleTrackMute(tr.id)}
            title="Mute"
          >
            {tr.muted ? "M" : "m"}
          </button>
          <button
            type="button"
            className="ist-btn ist-btn--ghost"
            style={{ padding: "0 4px", fontSize: 9, opacity: disabled ? 0.35 : 1 }}
            disabled={disabled}
            onClick={() => !disabled && actions.toggleTrackLock(tr.id)}
            title="Lock"
          >
            {tr.locked ? "L" : "l"}
          </button>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tr.name}>
            {tr.name}
          </span>
          {reserved ? (
            <span className="ist-mono" style={{ fontSize: 8, color: "var(--ist-muted)", flexShrink: 0 }}>
              reserved
            </span>
          ) : null}
        </div>
        <div
          className="ist-track-lane"
          style={{ minHeight: 32 }}
          onClick={(e) => {
            actions.selectTrack(tr.id);
            setPlayheadFromClientX(e.clientX, e.currentTarget);
          }}
        >
          <div
            className="ist-playhead"
            style={{ left: `${(project.playheadMs / duration) * 100}%` }}
            aria-hidden
          />
          {reserved && !isMagicTrack ? (
            <div
              className="ist-mono"
              style={{
                position: "absolute",
                inset: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: "var(--ist-muted)",
                borderRadius: 6,
                border: "1px dashed rgba(255,255,255,0.12)",
                pointerEvents: "none",
              }}
            >
              Magic layer · reserved
            </div>
          ) : null}
          {isMagicTrack
            ? magicBlocks.map((m) => {
                const left = (m.timelineStartMs / duration) * 100;
                const width = Math.max(((m.timelineEndMs - m.timelineStartMs) / duration) * 100, 0.9);
                const selected = project.selectedMagicRevealId === m.id;
                const uc = countUnlocksForReveal(unlocks, m.id);
                const pend = viewer ? pendingSettlementForReveal(unlocks, m.id, viewer.id) : { count: 0, pendingICoin: 0 };
                const pendLine =
                  pend.count > 0 ? ` · ${pend.pendingICoin.toFixed(2)} iCoin pending settlement` : "";
                const unlockedSim = unlocks.some(
                  (u) =>
                    u.revealId === m.id &&
                    (viewer ? u.viewerAccountId === viewer.id : true) &&
                    u.status === "unlocked" &&
                    u.unlockStatus === "unlocked"
                );
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`ist-clip ist-clip--magic${selected ? " ist-clip--selected" : ""}`}
                    style={{
                      position: "relative",
                      left: `${left}%`,
                      width: `${width}%`,
                      background: magicRevealAccent(m),
                      border: selected ? "1px solid rgba(190,242,100,0.7)" : "1px solid rgba(255,255,255,0.12)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.selectMagicReveal(m.id);
                      actions.selectTrack(tr.id);
                      actions.setActiveTool("magic");
                    }}
                    title={`${m.revealType} · ${formatTc(m.timelineStartMs)}–${formatTc(m.timelineEndMs)} · ${uc} sim unlock(s)${pendLine}`}
                  >
                    <span
                      className="ist-mono"
                      style={{
                        pointerEvents: "none",
                        fontSize: 7,
                        display: "block",
                        marginBottom: 2,
                        color: m.status === "blocked" ? "#fecaca" : "#a5f3fc",
                        fontWeight: 700,
                      }}
                    >
                      {magicTimelineBadge(m)}
                      {uc > 0 ? ` · ${uc}` : ""}
                      {pend.count > 0 ? " · ⏳" : ""}
                      {unlockedSim ? " · ✓" : ""}
                    </span>
                    <span style={{ pointerEvents: "none", fontSize: 9 }}>✦</span>{" "}
                    <span style={{ pointerEvents: "none", fontSize: 9 }}>{magicRevealLabel(m)}</span>
                    <span className="ist-mono" style={{ fontSize: 8, opacity: 0.8, pointerEvents: "none" }}>
                      {" "}
                      {formatTc(m.timelineEndMs - m.timelineStartMs)}
                    </span>
                  </button>
                );
              })
            : null}
          {!reserved && !isMagicTrack
            ? trackClips.map((c) => {
                const left = (c.timelineStartMs / duration) * 100;
                const width = Math.max(((c.timelineEndMs - c.timelineStartMs) / duration) * 100, 0.8);
                const selected = project.selectedClipId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`${clipClass(c)}${selected ? " ist-clip--selected" : ""}`}
                    style={{
                      position: "relative",
                      left: `${left}%`,
                      width: `${width}%`,
                      background: c.color ? `linear-gradient(90deg, ${c.color}55, ${c.color}22)` : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.selectClip(c.id);
                      actions.selectTrack(tr.id);
                    }}
                  >
                    <span style={{ pointerEvents: "none" }}>{c.name}</span>
                    <span className="ist-mono" style={{ fontSize: 8, opacity: 0.75, pointerEvents: "none" }}>
                      {" "}
                      {formatTc(c.timelineEndMs - c.timelineStartMs)}
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "15%",
                        bottom: "15%",
                        width: 4,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.35)",
                        pointerEvents: "none",
                      }}
                      title="Trim in"
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "15%",
                        bottom: "15%",
                        width: 4,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.35)",
                        pointerEvents: "none",
                      }}
                      title="Trim out"
                    />
                  </button>
                );
              })
            : null}
        </div>
      </div>
    );
  };

  return (
    <div className="ist-timeline" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexShrink: 0 }}>
        <span className="ist-display" style={{ fontSize: 11 }}>
          Timeline
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
            zoom {zoom.toFixed(2)}×
          </span>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ padding: "2px 8px", fontSize: 10 }} onClick={() => actions.setZoom(Math.max(0.5, zoom - 0.15))}>
            −
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ padding: "2px 8px", fontSize: 10 }} onClick={() => actions.setZoom(Math.min(3, zoom + 0.15))}>
            +
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ padding: "2px 8px", fontSize: 10 }} onClick={() => dispatch({ type: "TOGGLE_PLAYBACK" })}>
            {project.isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}>
        <div style={{ width: `${innerPct}%`, minWidth: "100%" }}>
          <div
            ref={rulerRef}
            className="ist-timeline-ruler"
            style={{ cursor: "pointer" }}
            onClick={(e) => setPlayheadFromClientX(e.clientX, e.currentTarget)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <span
                key={p}
                className="ist-mono"
                style={{
                  position: "absolute",
                  left: `${p * 100}%`,
                  top: 0,
                  fontSize: 9,
                  color: "var(--ist-muted)",
                  transform: "translateX(-50%)",
                }}
              >
                {formatTc(Math.round(duration * p))}
              </span>
            ))}
          </div>
          {orderedTracks.map(renderTrackRow)}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={duration}
        value={project.playheadMs}
        onChange={(e) => actions.setPlayhead(Number(e.target.value))}
        style={{ width: "100%", marginTop: 8, flexShrink: 0, accentColor: "#5eead4" }}
        aria-label="Scrub playhead"
      />
    </div>
  );
}
