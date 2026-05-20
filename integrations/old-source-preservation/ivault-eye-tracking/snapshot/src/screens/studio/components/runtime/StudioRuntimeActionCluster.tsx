import { useState, type Dispatch } from "react";
import type { RuntimeFeedAction } from "../../feed/studioFeedRuntimeStore";
import type { RuntimePost } from "../../feed/studioFeedTypes";

export function StudioRuntimeActionCluster({
  post,
  viewerAccountId,
  metrics,
  feedDispatch,
  disableMonetary = false,
}: {
  post: RuntimePost;
  viewerAccountId: string;
  metrics: RuntimePost["metrics"];
  feedDispatch: Dispatch<RuntimeFeedAction>;
  /** When true, hide/disable tip and other paid CTAs (e.g. age gate). */
  disableMonetary?: boolean;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const disabled = post.status === "blocked" || post.status === "archived" || post.status === "deleted";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" className="ist-btn ist-btn--ghost" disabled={disabled} onClick={() => feedDispatch({ type: "LIKE_POST", postId: post.id, viewerAccountId })}>
          ♥ {metrics.likes}
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled={disabled} onClick={() => feedDispatch({ type: "RECORD_VIEWER_ACTION", postId: post.id, viewerAccountId, action: "comment" })}>
          💬 {metrics.comments}
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled={disabled} onClick={() => feedDispatch({ type: "SAVE_POST", postId: post.id, viewerAccountId })}>
          ☆ {metrics.saves}
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled={disabled} onClick={() => feedDispatch({ type: "SHARE_POST", postId: post.id, viewerAccountId })}>
          ↗ {metrics.shares}
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled={disabled} onClick={() => feedDispatch({ type: "FOLLOW_CREATOR", postId: post.id, viewerAccountId })}>
          + Follow
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled={disabled || disableMonetary} title={disableMonetary ? "Complete age verification first" : undefined} onClick={() => setTipOpen((v) => !v)}>
          Tip
        </button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          disabled={disabled}
          onClick={() => feedDispatch({ type: "REPORT_POST", postId: post.id, viewerAccountId })}
          title="Report"
        >
          More
        </button>
      </div>
      {tipOpen && !disableMonetary ? (
        <div className="ist-panel" style={{ padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", width: "100%" }}>
            Tip (ledger simulation)
          </span>
          {[1, 3, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="ist-btn ist-btn--primary"
              disabled={disabled || disableMonetary}
              onClick={() => {
                feedDispatch({ type: "TIP_CREATOR", postId: post.id, viewerAccountId, amount: n });
                setTipOpen(false);
              }}
            >
              {n} iCoin
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
