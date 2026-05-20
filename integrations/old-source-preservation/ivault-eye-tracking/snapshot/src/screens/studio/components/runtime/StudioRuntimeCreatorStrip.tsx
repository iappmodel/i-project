import type { RuntimePost } from "../../feed/studioFeedTypes";

export function StudioRuntimeCreatorStrip({ post }: { post: RuntimePost }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "linear-gradient(135deg,#5eead4,#a78bfa)",
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div className="ist-display" style={{ fontSize: 13, fontWeight: 800 }}>
          {post.creatorName}
        </div>
        <div className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>
          {post.creatorHandle} · verified creator
        </div>
      </div>
    </div>
  );
}
