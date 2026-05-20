import type { Dispatch } from "react";
import type { RuntimeFeedAction } from "../../feed/studioFeedRuntimeStore";
import type { RuntimePost } from "../../feed/studioFeedTypes";
import type { MagicReveal } from "../../studioTypes";
import { viewerUnlockScenarioFromReveal } from "../../studioRevealEngine";

export function StudioRuntimeUnlockSheet({
  post,
  reveal,
  blockedReason,
  viewerAccountId,
  feedDispatch,
}: {
  post: RuntimePost;
  reveal: MagicReveal | null;
  blockedReason?: string;
  viewerAccountId: string;
  feedDispatch: Dispatch<RuntimeFeedAction>;
}) {
  const close = () => feedDispatch({ type: "SET_UNLOCK_SHEET", sheet: { open: false } });

  if (blockedReason) {
    return (
      <div
        className="ist-unlock-sheet-backdrop"
        role="dialog"
        aria-modal
        style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}
        onClick={close}
      >
        <div className="ist-panel" style={{ maxWidth: 420, width: "100%", marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
          <div className="ist-display" style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>
            Unlock blocked
          </div>
          <p className="ist-mono" style={{ fontSize: 12, color: "var(--ist-muted)" }}>{blockedReason}</p>
          <button type="button" className="ist-btn ist-btn--primary" style={{ marginTop: 12, width: "100%" }} onClick={close}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!reveal) return null;

  const scenario = viewerUnlockScenarioFromReveal(reveal);

  return (
    <div
      className="ist-unlock-sheet-backdrop"
      role="dialog"
      aria-modal
      style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}
      onClick={close}
    >
      <div className="ist-panel" style={{ maxWidth: 420, width: "100%", marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
        <div className="ist-display" style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
          Unlock reveal
        </div>
        <p className="ist-mono" style={{ fontSize: 12, color: "var(--ist-muted)", marginBottom: 8 }}>
          {reveal.name} · {reveal.revealType} · scenario: {scenario}
        </p>
        <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>
          Simulated unlock uses Stage 3 wallet ledger (same as Studio Magic preview).
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ flex: 1 }} onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="ist-btn ist-btn--primary"
            style={{ flex: 1 }}
            onClick={() =>
              feedDispatch({
                type: "UNLOCK_MAGIC_REVEAL",
                postId: post.id,
                viewerAccountId,
                revealId: reveal.id,
              })
            }
          >
            Confirm unlock
          </button>
        </div>
      </div>
    </div>
  );
}
