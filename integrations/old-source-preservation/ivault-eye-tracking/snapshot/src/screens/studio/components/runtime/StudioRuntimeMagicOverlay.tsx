import type { MagicReveal } from "../../studioTypes";
import type { Dispatch } from "react";
import type { RuntimeFeedAction } from "../../feed/studioFeedRuntimeStore";
import type { RuntimePost, RuntimeViewerSession } from "../../feed/studioFeedTypes";
import { resolveRuntimeTap } from "../../feed/studioFeedRuntimeTap";

export function StudioRuntimeMagicOverlay({
  post,
  reveal,
  playheadMs,
  session,
  unlockedIds,
  viewerAccountId,
  feedDispatch,
  onTap,
}: {
  post: RuntimePost;
  reveal: MagicReveal;
  playheadMs: number;
  session: RuntimeViewerSession | null;
  unlockedIds: Set<string>;
  viewerAccountId: string;
  feedDispatch: Dispatch<RuntimeFeedAction>;
  onTap: (resolution: ReturnType<typeof resolveRuntimeTap>) => void;
}) {
  if (reveal.status === "deleted") return null;

  const blocked =
    reveal.status === "blocked" || reveal.safety.publishBlocked || reveal.safety.safetyStatus === "blocked";
  const unlocked = unlockedIds.has(reveal.id);
  const inWindow = playheadMs >= reveal.timelineStartMs && playheadMs <= reveal.timelineEndMs;
  if (!inWindow && !unlocked) return null;

  const res = resolveRuntimeTap({
    post,
    reveal,
    session,
    playheadMs,
    unlockedRevealIds: unlockedIds,
    blockedRevealIds: blocked ? new Set([reveal.id]) : undefined,
  });

  const label = (() => {
    if (unlocked) return "Unlocked";
    if (blocked) return "Blocked";
    if (res.blockedReason?.includes("paused")) return "Paused";
    if (res.blockedReason?.includes("review")) return "Under review";
    if (res.requiredAction === "verify_age") return "Age gated";
    if (reveal.revealType === "collective_reveal") {
      const cur = reveal.collectiveProgress?.current ?? 0;
      const goal = reveal.collectiveProgress?.goal ?? reveal.eligibility.revealAfterTotalTips ?? 100;
      return `Collective ${cur}/${goal}`;
    }
    if (reveal.revealType === "tip_to_reveal" || reveal.revealType === "pay_to_reveal") {
      return `${reveal.pricing?.amount ?? "?"} ${reveal.pricing?.coin ?? "iCoin"}`;
    }
    if (reveal.revealType === "watch_to_reveal") return "Watch to reveal";
    return "Magic";
  })();

  return (
    <button
      type="button"
      className="ist-magic-overlay ist-magic-overlay--pay"
      style={{
        position: "absolute",
        left: `${(reveal.geometry?.x ?? 0.1) * 100}%`,
        top: `${(reveal.geometry?.y ?? 0.35) * 100}%`,
        width: `${(reveal.geometry?.width ?? 0.5) * 100}%`,
        height: `${(reveal.geometry?.height ?? 0.18) * 100}%`,
        border: "1px solid rgba(168,85,247,0.45)",
        borderRadius: 10,
        background: unlocked ? "rgba(34,197,94,0.2)" : "rgba(0,0,0,0.45)",
        color: "#e2e8f0",
        fontSize: 11,
        cursor: unlocked ? "default" : "pointer",
        zIndex: 12,
      }}
      disabled={unlocked}
      onClick={() => {
        if (unlocked) return;
        feedDispatch({ type: "TAP_MAGIC_REVEAL", postId: post.id, viewerAccountId, revealId: reveal.id });
        onTap(res);
      }}
    >
      <span className="ist-mono" style={{ pointerEvents: "none" }}>
        {label}
      </span>
    </button>
  );
}
