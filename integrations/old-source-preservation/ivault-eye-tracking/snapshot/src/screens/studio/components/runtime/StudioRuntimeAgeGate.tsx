import type { Dispatch, ReactNode } from "react";
import type { RuntimeFeedAction } from "../../feed/studioFeedRuntimeStore";
import type { RuntimePost } from "../../feed/studioFeedTypes";

export function StudioRuntimeAgeGate({
  post,
  viewerAccountId,
  sessionId,
  passed,
  feedDispatch,
  childrenWhenPassed,
}: {
  post: RuntimePost;
  viewerAccountId: string;
  sessionId: string | null;
  passed: boolean;
  feedDispatch: Dispatch<RuntimeFeedAction>;
  childrenWhenPassed: ReactNode;
}) {
  const needs =
    post.postPackage.runtimeConfig.requireAgeGateBeforeView ||
    post.postPackage.ageRating === "eighteen_plus" ||
    post.postPackage.ageRating === "twentyone_plus" ||
    post.postPackage.ageRating === "restricted";

  if (!needs || passed) {
    return <>{childrenWhenPassed}</>;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.82)",
        zIndex: 25,
        padding: 16,
        textAlign: "center",
        gap: 12,
      }}
    >
      <div className="ist-display" style={{ fontSize: 15, fontWeight: 800 }}>
        Age verification
      </div>
      <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)", margin: 0, maxWidth: 280 }}>
        Monetized actions stay hidden until age gate passes (simulation).
      </p>
      <button
        type="button"
        className="ist-btn ist-btn--primary"
        onClick={() => feedDispatch({ type: "PASS_AGE_GATE", postId: post.id, viewerAccountId, sessionId: sessionId ?? undefined })}
      >
        Mock verify age
      </button>
    </div>
  );
}
