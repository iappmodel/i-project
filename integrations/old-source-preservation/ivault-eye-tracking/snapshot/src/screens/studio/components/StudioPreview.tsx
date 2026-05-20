import type { CSSProperties } from "react";
import type { AspectRatio, MagicReveal, StudioCAFSegment } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { findWalletAccountByType, simulatedUnlockBadge } from "../wallet/studioWalletUi";
import { StudioPlaybackControls } from "./StudioPlaybackControls";
import { StudioUploadDropzone } from "./StudioUploadDropzone";

function defaultMagicBox(): { x: number; y: number; width: number; height: number } {
  return { x: 0.12, y: 0.38, width: 0.76, height: 0.22 };
}

function magicGeometryPct(m: MagicReveal): { left: string; top: string; width: string; height: string } {
  const g = m.geometry ?? defaultMagicBox();
  return {
    left: `${g.x * 100}%`,
    top: `${g.y * 100}%`,
    width: `${g.width * 100}%`,
    height: `${g.height * 100}%`,
  };
}

function cafGeometryPct(s: StudioCAFSegment): { left: string; top: string; width: string; height: string } {
  return {
    left: `${s.x * 100}%`,
    top: `${s.y * 100}%`,
    width: `${s.width * 100}%`,
    height: `${s.height * 100}%`,
  };
}

function magicOverlayClasses(m: MagicReveal): string {
  const blocked = m.status === "blocked" || m.safety.safetyStatus === "blocked" || m.safety.publishBlocked;
  if (blocked) return "ist-magic-overlay ist-magic-overlay--blocked";
  if (m.revealType === "always_hidden" || m.safety.safetyClass === "privacy_sensitive") {
    return "ist-magic-overlay ist-magic-overlay--privacy";
  }
  if (m.revealType === "watch_to_reveal") return "ist-magic-overlay ist-magic-overlay--watch";
  if (m.revealType === "age_to_reveal" || m.safety.ageGateRequired) return "ist-magic-overlay ist-magic-overlay--age";
  if (m.revealType === "tip_to_reveal" || m.revealType === "pay_to_reveal" || m.revealType === "collective_reveal") {
    return "ist-magic-overlay ist-magic-overlay--pay";
  }
  return "ist-magic-overlay";
}

function hiddenLayerStyle(m: MagicReveal, soften: boolean): CSSProperties {
  const { mode, strength } = m.hiddenRender;
  const blurPx = Math.min(48, 8 + strength * 0.22);
  const dim = soften ? 0.35 : 1;
  switch (mode) {
    case "blackout":
      return { background: `rgba(0,0,0,${0.88 * dim})` };
    case "frosted":
      return {
        background: `rgba(255,255,255,${0.12 * dim})`,
        backdropFilter: soften ? `blur(${blurPx * 0.45}px) saturate(1.05)` : `blur(${blurPx}px) saturate(1.12)`,
      };
    case "blur":
      return {
        background: `rgba(15,23,42,${0.42 * dim})`,
        backdropFilter: soften ? `blur(${blurPx * 0.5}px)` : `blur(${blurPx}px)`,
      };
    case "pixelate":
      return {
        background: "repeating-linear-gradient(135deg, rgba(0,0,0,0.55) 0 4px, rgba(255,255,255,0.1) 4px 8px)",
        opacity: soften ? 0.45 : 1,
      };
    case "symbol":
      return { background: "linear-gradient(180deg, rgba(15,23,42,0.72), rgba(0,0,0,0.88))", opacity: soften ? 0.5 : 1 };
    case "teaser_overlay":
      return {
        background: "linear-gradient(165deg, rgba(0,0,0,0.2), rgba(15,23,42,0.9) 50%, rgba(168,85,247,0.18))",
        border: "1px solid rgba(168,85,247,0.35)",
        opacity: soften ? 0.55 : 1,
      };
    default:
      return { background: `rgba(0,0,0,${0.5 * dim})` };
  }
}

function aspectStyle(ar: AspectRatio): CSSProperties {
  if (ar === "16:9") return { aspectRatio: "16 / 9", maxHeight: "min(48vh, 520px)", width: "100%" };
  if (ar === "1:1") return { aspectRatio: "1 / 1", maxHeight: "min(52vh, 560px)", width: "100%" };
  if (ar === "4:5") return { aspectRatio: "4 / 5", maxHeight: "min(58vh, 640px)", width: "100%" };
  if (ar === "original") return { aspectRatio: "9 / 16", maxHeight: "min(62vh, 720px)", width: "100%" };
  return { aspectRatio: "9 / 16", maxHeight: "min(62vh, 720px)", width: "100%" };
}

export function StudioPreview({ studio }: { studio: StudioController }) {
  const { project, unlocks, studioSimPost, walletAccounts } = studio.state;
  const viewer = findWalletAccountByType(walletAccounts, "viewer");

  if (project.status === "empty") {
    return (
      <div className="ist-studio-preview-col" style={{ justifyContent: "center" }}>
        <StudioUploadDropzone studio={studio} />
      </div>
    );
  }

  const mainVideo = project.clips.find((c) => c.id === project.selectedClipId && c.type === "video") ?? project.clips.find((c) => c.type === "video");
  const caption = project.clips.find(
    (c) => c.type === "caption" && project.playheadMs >= c.timelineStartMs && project.playheadMs <= c.timelineEndMs
  );
  const textClip = project.clips.find(
    (c) => c.type === "text" && project.playheadMs >= c.timelineStartMs && project.playheadMs <= c.timelineEndMs
  );
  const overlay = project.overlays.find(
    (o) => project.playheadMs >= o.startMs && project.playheadMs <= o.endMs
  );

  const t = project.playheadMs;
  const magicAtTime = project.magicReveals.filter(
    (m) => m.status !== "deleted" && t >= m.timelineStartMs && t <= m.timelineEndMs
  );
  const selectedMagic =
    project.selectedMagicRevealId != null
      ? project.magicReveals.find((m) => m.id === project.selectedMagicRevealId && m.status !== "deleted")
      : undefined;
  const magicGhost =
    selectedMagic &&
    selectedMagic.status !== "deleted" &&
    !magicAtTime.some((m) => m.id === selectedMagic.id)
      ? selectedMagic
      : undefined;
  const cafAtTime = project.cafSegments.filter((s) => t >= s.timelineStartMs && t <= s.timelineEndMs);

  return (
    <div className="ist-studio-preview-col">
      <div className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>
        Preview · {project.aspectRatio} · mock canvas
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            border: "1px solid var(--ist-line)",
            overflow: "hidden",
            background: "#000",
            margin: "0 auto",
            ...aspectStyle(project.aspectRatio),
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(145deg, rgba(94,234,212,0.12), transparent 42%), linear-gradient(300deg, rgba(251,191,36,0.08), transparent 48%), radial-gradient(circle at 50% 40%, rgba(255,255,255,0.06), transparent 55%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "8% 10%",
              borderRadius: 12,
              border: mainVideo && project.selectedClipId === mainVideo.id ? "2px solid rgba(190,242,100,0.55)" : "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(180deg, rgba(15,23,42,0.5), rgba(15,23,42,0.9))",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: "18%",
              }}
            >
              <div
                style={{
                  width: "88%",
                  height: 36,
                  borderRadius: 6,
                  background: "repeating-linear-gradient(90deg, rgba(94,234,212,0.25) 0 4px, rgba(94,234,212,0.08) 4px 8px)",
                  opacity: 0.85,
                }}
                title="Waveform placeholder"
              />
            </div>
          </div>

          {caption ? (
            <div
              style={{
                position: "absolute",
                left: "6%",
                right: "6%",
                bottom: "14%",
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 12,
                color: "#e2e8f0",
                textAlign: "center",
              }}
            >
              [Caption] Live take · room noise gated
            </div>
          ) : null}

          {textClip || overlay ? (
            <div
              className="ist-display"
              style={{
                position: "absolute",
                left: `${((textClip?.transform?.x as number) ?? overlay?.x ?? 0.08) * 100}%`,
                top: `${((textClip?.transform?.y as number) ?? overlay?.y ?? 0.12) * 100}%`,
                color: overlay?.color ?? "#ecfccb",
                fontSize: overlay?.fontSize ?? 18,
                fontWeight: 800,
                textShadow: "0 2px 18px rgba(0,0,0,0.85)",
              }}
            >
              {overlay?.text ?? textClip?.name ?? "TEXT"}
            </div>
          ) : null}

          {cafAtTime.map((s) => {
            const box = cafGeometryPct(s);
            return (
              <div
                key={s.id}
                style={{
                  position: "absolute",
                  ...box,
                  borderRadius: 10,
                  border: "1px dashed rgba(96,165,250,0.6)",
                  backdropFilter: s.renderMode === "blur" ? "blur(14px)" : undefined,
                  background:
                    s.renderMode === "pixelate"
                      ? "repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0 3px, rgba(255,255,255,0.08) 3px 6px)"
                      : "rgba(0,0,0,0.35)",
                  pointerEvents: "none",
                }}
                title={`CAF · ${s.accessType}`}
              />
            );
          })}

          {magicGhost ? (
            <button
              key={`${magicGhost.id}_ghost`}
              type="button"
              className={`${magicOverlayClasses(magicGhost)} ist-magic-overlay--ghost`}
              style={{
                position: "absolute",
                ...magicGeometryPct(magicGhost),
                borderRadius: 12,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                ...hiddenLayerStyle(magicGhost, false),
                opacity: 0.55,
              }}
              onClick={(e) => {
                e.stopPropagation();
                studio.actions.selectMagicReveal(magicGhost.id);
                studio.actions.setActiveTool("magic");
              }}
              title={`${magicGhost.name} (selected · playhead outside range)`}
            >
              <span className="ist-mono" style={{ fontSize: 8, color: "#e9d5ff" }}>
                Selected
              </span>
              <span className="ist-mono" style={{ fontSize: 9, color: "#cbd5e1" }}>
                {magicGhost.hiddenRender.overlayText ?? "Magic"}
              </span>
            </button>
          ) : null}

          {magicAtTime.map((m) => {
            const box = magicGeometryPct(m);
            const selected = project.selectedMagicRevealId === m.id;
            const showLock = m.revealType !== "free_tap_reveal" && m.revealType !== "always_hidden";
            const blocked = m.status === "blocked" || m.safety.safetyStatus === "blocked" || m.safety.publishBlocked;
            const simBadge =
              viewer != null
                ? simulatedUnlockBadge(unlocks, m, viewer.id, { collectiveTotalTips: studioSimPost.totalTips })
                : ({ kind: "none" } as const);
            const simUnlocked = simBadge.kind === "unlocked";
            const simPending = simBadge.kind === "pending" || simBadge.kind === "collective";
            const simBlocked = simBadge.kind === "blocked";
            return (
              <button
                key={m.id}
                type="button"
                className={magicOverlayClasses(m)}
                onClick={(e) => {
                  e.stopPropagation();
                  studio.actions.selectMagicReveal(m.id);
                  studio.actions.setActiveTool("magic");
                }}
                style={{
                  position: "absolute",
                  ...box,
                  borderRadius: 12,
                  border: selected ? "2px solid rgba(190,242,100,0.9)" : undefined,
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  ...hiddenLayerStyle(m, simUnlocked && m.revealType !== "always_hidden"),
                  boxShadow: selected ? "0 0 28px rgba(168,85,247,0.4)" : undefined,
                }}
                title={m.name}
              >
                <span className="ist-mono" style={{ fontSize: 11, color: "#faf5ff" }}>
                  {m.revealType === "always_hidden" ? "🔒" : "✦"}
                </span>
                {showLock ? (
                  <span className="ist-mono" style={{ fontSize: 8, color: "#faf5ff", fontWeight: 800, letterSpacing: "0.1em" }}>
                    LOCK
                  </span>
                ) : null}
                <span className="ist-mono" style={{ fontSize: 9, color: "#e9d5ff", textAlign: "center", padding: "0 4px", lineHeight: 1.25 }}>
                  {m.hiddenRender.overlayText ?? m.revealType.replace(/_/g, " ")}
                </span>
                {m.pricing && (m.revealType === "tip_to_reveal" || m.revealType === "pay_to_reveal") ? (
                  <span
                    className="ist-mono"
                    style={{
                      fontSize: 10,
                      color: "#ecfccb",
                      borderRadius: 999,
                      padding: "2px 8px",
                      border: "1px solid rgba(190,242,100,0.45)",
                      background: "rgba(15,23,42,0.65)",
                    }}
                  >
                    {m.pricing.amount} {m.pricing.coin}
                  </span>
                ) : null}
                {blocked ? (
                  <span
                    className="ist-mono"
                    style={{
                      fontSize: 9,
                      color: "#fecaca",
                      borderRadius: 6,
                      padding: "2px 6px",
                      border: "1px solid rgba(248,113,113,0.5)",
                      background: "rgba(127,29,29,0.35)",
                    }}
                  >
                    Blocked
                  </span>
                ) : null}
                {simBlocked && !blocked ? (
                  <span
                    className="ist-mono"
                    style={{
                      fontSize: 9,
                      color: "#fecaca",
                      borderRadius: 6,
                      padding: "2px 6px",
                      border: "1px solid rgba(248,113,113,0.45)",
                      background: "rgba(127,29,29,0.28)",
                    }}
                  >
                    Sim blocked
                  </span>
                ) : null}
                {simUnlocked ? (
                  <span
                    className="ist-mono"
                    style={{
                      fontSize: 9,
                      color: "#bbf7d0",
                      borderRadius: 6,
                      padding: "2px 6px",
                      border: "1px solid rgba(74,222,128,0.55)",
                      background: "rgba(22,101,52,0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ✓ Unlocked
                  </span>
                ) : null}
                {simPending && !simUnlocked && !simBlocked ? (
                  <span
                    className="ist-mono"
                    style={{
                      fontSize: 9,
                      color: "#fde68a",
                      borderRadius: 6,
                      padding: "2px 6px",
                      border: "1px solid rgba(251,191,36,0.45)",
                      background: "rgba(120,53,15,0.28)",
                    }}
                  >
                    {simBadge.kind === "collective" ? `${simBadge.label} fund` : "Pending"}
                  </span>
                ) : null}
                {selected ? (
                  <span className="ist-mono" style={{ fontSize: 8, color: "#bef264", marginTop: 2 }}>
                    Selected
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="ist-preview-safe" style={{ opacity: 0.7, pointerEvents: "none" }} />

          <StudioPlaybackControls studio={studio} />
        </div>
      </div>
    </div>
  );
}
