import { useEffect, useMemo, useState } from "react";
import type { PostPackage } from "../publish/studioPublishTypes";
import {
  getPostRuntimeState,
  resolveRuntimeTap,
  walletAccountToPostRuntimeViewer,
} from "../publish/studioRuntimeEngine";
import { findWalletAccountByType } from "../wallet/studioWalletUi";
import type { MagicReveal } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { ViewerUnlockSheetPreview } from "../panels/magic/ViewerUnlockSheetPreview";
import { formatCoinAmount } from "../wallet/studioWalletLedger";

function unlockedIdsForPackage(unlocks: StudioController["state"]["unlocks"], postId: string, viewerId: string): Set<string> {
  const s = new Set<string>();
  for (const u of unlocks) {
    if (u.postId === postId && u.viewerAccountId === viewerId && u.status === "unlocked" && u.unlockStatus === "unlocked") {
      s.add(u.revealId);
    }
  }
  return s;
}

export function StudioPostRuntimePreview({ studio, pkg, onClose }: { studio: StudioController; pkg: PostPackage; onClose: () => void }) {
  const { actions, state } = studio;
  const viewerAcc = findWalletAccountByType(state.walletAccounts, "viewer");
  const viewerId = viewerAcc?.userId ?? "user_viewer_demo";
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sheetReveal, setSheetReveal] = useState<MagicReveal | null>(null);

  const durationMs = pkg.exportManifest.durationMs || pkg.timeline.durationMs || 32_000;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPlayheadMs((ms) => {
        const n = ms + 200;
        return n >= durationMs ? 0 : n;
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [playing, durationMs]);

  const viewer = useMemo(() => (viewerAcc ? walletAccountToPostRuntimeViewer(viewerAcc) : null), [viewerAcc]);

  const unlockState = useMemo(
    () => ({ unlockedRevealIds: unlockedIdsForPackage(state.unlocks, pkg.id, viewerId) }),
    [state.unlocks, pkg.id, viewerId]
  );

  const runtime = useMemo(() => {
    if (!viewer) {
      return null;
    }
    return getPostRuntimeState({ postPackage: pkg, viewerAccount: viewer, unlocks: unlockState, playheadMs });
  }, [pkg, viewer, unlockState, playheadMs]);

  const simPost = useMemo(
    () => ({ postId: pkg.id, verifiedViews: 0, totalTips: 0, publishedAt: pkg.createdAt }),
    [pkg]
  );

  if (!viewer || !runtime) {
    return (
      <div className="ist-mono" style={{ padding: 24, color: "#fecaca" }}>
        Wallet mock missing viewer account.
        <button type="button" className="ist-btn ist-btn--ghost" style={{ marginLeft: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  const thumb = pkg.exportManifest.thumbnailUrl;
  const creatorAcc = findWalletAccountByType(state.walletAccounts, "creator");
  const viewerICoin = viewerAcc?.balances.find((b) => b.coin === "iCoin")?.available ?? 0;

  return (
    <div
      role="dialog"
      aria-label="Post runtime preview"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 91,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="ist-panel"
        style={{
          width: "min(420px, 100%)",
          maxHeight: "min(92vh, 900px)",
          overflow: "auto",
          padding: 12,
          borderColor: "rgba(94,234,212,0.25)",
          background: "rgba(15,23,42,0.98)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span className="ist-display" style={{ fontSize: 13, fontWeight: 800 }}>
            Feed runtime (package)
          </span>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "0 0 10px" }}>
          Immutable snapshot · unlocks post to <code>{pkg.id.slice(0, 18)}…</code>
        </p>

        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#020617" }}>
          <div style={{ position: "relative", aspectRatio: "9/16", maxHeight: 420 }}>
            <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
                background: "linear-gradient(180deg, rgba(0,0,0,0.65), transparent)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="ist-display" style={{ fontSize: 12, fontWeight: 800 }}>
                  {creatorAcc?.displayName ?? "Creator"}
                </div>
                <div className="ist-mono" style={{ fontSize: 9, color: "#cbd5e1" }}>
                  @{creatorAcc?.userId ?? "creator"}
                </div>
              </div>
              {runtime.walletChipVisible ? (
                <span className="ist-mono" style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(94,234,212,0.35)", background: "rgba(15,23,42,0.75)" }}>
                  {formatCoinAmount(viewerICoin, "iCoin")}
                </span>
              ) : null}
            </div>
            <div style={{ position: "absolute", bottom: 44, left: 8, right: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {runtime.disclosuresToShow.map((d) => (
                <span key={d.id} className="ist-chip ist-chip--muted ist-mono" style={{ fontSize: 9 }}>
                  {d.label}
                </span>
              ))}
            </div>
            {runtime.visibleReveals.map((r) => {
              const unlocked = unlockState.unlockedRevealIds instanceof Set ? unlockState.unlockedRevealIds.has(r.id) : false;
              const inWin = playheadMs >= r.timelineStartMs && playheadMs < r.timelineEndMs;
              if (!inWin && !unlocked) return null;
              return (
                <button
                  key={r.id}
                  type="button"
                  className="ist-magic-overlay ist-magic-overlay--pay"
                  style={{
                    position: "absolute",
                    left: `${(r.geometry?.x ?? 0.1) * 100}%`,
                    top: `${(r.geometry?.y ?? 0.35) * 100}%`,
                    width: `${(r.geometry?.width ?? 0.5) * 100}%`,
                    height: `${(r.geometry?.height ?? 0.14) * 100}%`,
                    border: "1px solid rgba(168,85,247,0.45)",
                    borderRadius: 10,
                    background: unlocked ? "rgba(34,197,94,0.25)" : "rgba(0,0,0,0.5)",
                    color: "#e2e8f0",
                    fontSize: 11,
                    cursor: unlocked ? "default" : "pointer",
                    zIndex: 14,
                  }}
                  disabled={unlocked}
                  onClick={() => {
                    if (unlocked) return;
                    const res = resolveRuntimeTap({ reveal: r, viewerAccount: viewer, postPackage: pkg, unlocks: unlockState });
                    if (res.shouldOpenUnlockSheet) setSheetReveal(r);
                    else if (res.blockedReason) window.alert(res.blockedReason);
                  }}
                >
                  <span className="ist-mono">{unlocked ? "Unlocked" : "Tap to unlock"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            type="range"
            min={0}
            max={durationMs}
            value={playheadMs}
            onChange={(e) => setPlayheadMs(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", display: "flex", justifyContent: "space-between" }}>
            <span>{Math.round(playheadMs)} ms</span>
            <span>{durationMs} ms</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button type="button" className="ist-btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          <span className="ist-btn ist-btn--ghost" style={{ fontSize: 11, pointerEvents: "none" }}>
            ♥ Like
          </span>
          <span className="ist-btn ist-btn--ghost" style={{ fontSize: 11, pointerEvents: "none" }}>
            💬 Comment
          </span>
          <span className="ist-btn ist-btn--ghost" style={{ fontSize: 11, pointerEvents: "none" }}>
            ☆ Save
          </span>
          <span className="ist-btn ist-btn--ghost" style={{ fontSize: 11, pointerEvents: "none" }}>
            ↗ Share
          </span>
          <span className="ist-btn ist-btn--ghost" style={{ fontSize: 11, pointerEvents: "none" }}>
            Tip (sim)
          </span>
        </div>
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", margin: "10px 0 0" }}>
          {pkg.caption}
        </p>
      </div>

      {sheetReveal ? (
        <ViewerUnlockSheetPreview
          studio={studio}
          reveal={sheetReveal}
          scenario={state.project.unlockPreviewScenario}
          postOverride={simPost}
          onClose={() => setSheetReveal(null)}
        />
      ) : null}
    </div>
  );
}
