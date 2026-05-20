import { useRuntimeFeed } from "../../feed/RuntimeFeedContext";
import { StudioRuntimePost } from "./StudioRuntimePost";

/**
 * Vertical runtime feed preview — local simulation, production-shaped layout.
 */
export function StudioRuntimeFeed() {
  const { feedState, feedDispatch } = useRuntimeFeed();
  const activeId = feedState.activePostId ?? feedState.posts[0]?.id ?? null;

  return (
    <div className="ist-scroll" style={{ maxHeight: "min(72vh, 640px)", paddingRight: 6 }}>
      <h3 className="ist-panel__title" style={{ marginBottom: 10 }}>
        Runtime feed
      </h3>
      <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginBottom: 14 }}>
        {feedState.posts.length} posts · active slot drives wallet + Magic unlock simulation.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {feedState.posts.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ist-btn ist-btn--ghost${activeId === p.id ? " ist-tool-btn--active" : ""}`}
            style={{ justifyContent: "flex-start", textAlign: "left", padding: "8px 10px" }}
            onClick={() => feedDispatch({ type: "SET_ACTIVE_POST", postId: p.id })}
          >
            <span className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", display: "block" }}>
              {p.status} · {p.creatorHandle}
            </span>
            <span className="ist-display" style={{ fontSize: 12 }}>{p.caption.slice(0, 72)}{p.caption.length > 72 ? "…" : ""}</span>
          </button>
        ))}
      </div>
      {activeId ? (
        <StudioRuntimePost
          post={feedState.posts.find((p) => p.id === activeId)!}
          feedState={feedState}
          feedDispatch={feedDispatch}
          isActive
        />
      ) : (
        <div className="ist-panel ist-mono" style={{ fontSize: 11, padding: 16 }}>
          No posts in runtime store.
        </div>
      )}
    </div>
  );
}
