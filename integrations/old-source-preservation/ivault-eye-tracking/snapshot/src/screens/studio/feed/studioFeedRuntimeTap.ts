import type { RuntimeTapResolution } from "../publish/studioPublishTypes";
import type { MagicReveal } from "../studioTypes";
import type { RuntimePost, RuntimeViewerSession } from "./studioFeedTypes";

export function resolveRuntimeTap(input: {
  post: RuntimePost;
  reveal: MagicReveal;
  session: RuntimeViewerSession | null;
  playheadMs: number;
  unlockedRevealIds: Set<string>;
  blockedRevealIds?: Set<string>;
}): RuntimeTapResolution {
  const { post, reveal, session, playheadMs, unlockedRevealIds, blockedRevealIds } = input;

  if (post.status === "blocked") {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Post is blocked.", requiredAction: undefined };
  }
  if (post.status === "under_review") {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Post under review — new unlocks disabled.", requiredAction: undefined };
  }
  if (post.status === "paused") {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Post paused — no new unlocks.", requiredAction: undefined };
  }
  if (post.status === "archived" || post.status === "deleted") {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Post not available in feed.", requiredAction: undefined };
  }

  if (unlockedRevealIds.has(reveal.id)) {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: true };
  }
  if (blockedRevealIds?.has(reveal.id)) {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Reveal blocked.", requiredAction: undefined };
  }

  const inWindow = playheadMs >= reveal.timelineStartMs && playheadMs <= reveal.timelineEndMs;
  if (!inWindow) {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Reveal not active at this time.", requiredAction: undefined };
  }

  if (post.postPackage.runtimeConfig.requireAgeGateBeforeView && session && !session.ageGatePassed) {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Age verification required.", requiredAction: "verify_age" };
  }

  if (reveal.safety.ageGateRequired && session && !session.ageGatePassed) {
    return { shouldOpenUnlockSheet: false, alreadyUnlocked: false, blockedReason: "Reveal requires age gate.", requiredAction: "verify_age" };
  }

  return { shouldOpenUnlockSheet: true, alreadyUnlocked: false };
}
