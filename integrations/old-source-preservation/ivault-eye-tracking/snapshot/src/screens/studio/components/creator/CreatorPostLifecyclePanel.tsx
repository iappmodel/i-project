import type { Dispatch } from "react";
import type { RuntimeFeedAction } from "../../feed/studioFeedRuntimeStore";
import type { RuntimePost } from "../../feed/studioFeedTypes";
import type { StudioRevealUnlock } from "../../wallet/studioWalletTypes";
import { canArchivePost, canDeletePost, canPausePost, canUnpublishPost } from "../../feed/studioPostLifecycle";

export function CreatorPostLifecyclePanel({
  post,
  unlocks,
  feedDispatch,
}: {
  post: RuntimePost;
  unlocks: StudioRevealUnlock[];
  feedDispatch: Dispatch<RuntimeFeedAction>;
}) {
  const pauseOk = canPausePost(post);
  const archiveOk = canArchivePost(post);
  const canDel = canDeletePost(post, unlocks);
  const unpub = canUnpublishPost(post, unlocks);

  return (
    <div>
      <div className="ist-display" style={{ fontSize: 12, marginBottom: 8 }}>Lifecycle</div>
      <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginBottom: 10, lineHeight: 1.5 }}>
        Published: visible and unlockable · Paused: no new unlocks, prior unlocks kept · Archived: hidden from feed, ledger preserved · Under review: restricted unlocks ·
        Delete blocked when unsettled paid unlocks exist.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          disabled={!pauseOk || post.status === "paused"}
          onClick={() => feedDispatch({ type: "PAUSE_POST", postId: post.id })}
        >
          Pause post
        </button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          disabled={post.status !== "paused"}
          onClick={() => feedDispatch({ type: "RESUME_POST", postId: post.id })}
        >
          Resume post
        </button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          disabled={!archiveOk}
          onClick={() => {
            if (unpub.refundPolicyWarning) window.alert(unpub.refundPolicyWarning);
            feedDispatch({ type: "ARCHIVE_POST", postId: post.id });
          }}
        >
          Archive post
        </button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          disabled={!canDel}
          onClick={() => {
            if (!canDel) return;
            if (!window.confirm("Delete this post in simulation?")) return;
            feedDispatch({ type: "DELETE_POST", postId: post.id });
          }}
        >
          Delete post
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => feedDispatch({ type: "SEND_TO_REVIEW", postId: post.id })}>
          Send to review
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled title="Stage 6+ — duplicate to new Studio project">
          Duplicate to new Studio project
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled title="Stage 6+ — new package version">
          Create new version
        </button>
      </div>
    </div>
  );
}
