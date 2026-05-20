import type { Dispatch } from "react";
import type { RuntimeFeedAction } from "../../feed/studioFeedRuntimeStore";
import type { RuntimePost } from "../../feed/studioFeedTypes";
import type { StudioRevealUnlock } from "../../wallet/studioWalletTypes";
import { canArchivePost, canDeletePost, canPausePost } from "../../feed/studioPostLifecycle";

export function StudioRuntimePostControls({
  post,
  unlocks,
  feedDispatch,
}: {
  post: RuntimePost;
  unlocks: StudioRevealUnlock[];
  feedDispatch: Dispatch<RuntimeFeedAction>;
}) {
  return (
    <div className="ist-panel" style={{ marginTop: 10, padding: 10 }}>
      <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginBottom: 8 }}>
        Creator controls (mock)
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {canPausePost(post) ? (
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => feedDispatch({ type: "PAUSE_POST", postId: post.id })}>
            Pause
          </button>
        ) : null}
        {post.status === "paused" ? (
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => feedDispatch({ type: "RESUME_POST", postId: post.id })}>
            Resume
          </button>
        ) : null}
        {canArchivePost(post) ? (
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => feedDispatch({ type: "ARCHIVE_POST", postId: post.id })}>
            Archive
          </button>
        ) : null}
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => feedDispatch({ type: "SEND_TO_REVIEW", postId: post.id })}>
          Send to review
        </button>
        {canDeletePost(post, unlocks) ? (
          <button type="button" className="ist-btn ist-btn--ghost" style={{ color: "#fecaca" }} onClick={() => feedDispatch({ type: "DELETE_POST", postId: post.id })}>
            Delete
          </button>
        ) : (
          <span className="ist-mono" style={{ fontSize: 9, color: "#fecaca" }}>
            Delete disabled (unsettled unlocks)
          </span>
        )}
      </div>
    </div>
  );
}
